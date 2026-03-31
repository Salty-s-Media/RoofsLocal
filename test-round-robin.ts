/**
 * Local least-assignments round-robin verification script.
 * Run with: npx ts-node test-round-robin.ts
 *
 * Uses an in-memory mock of Prisma — no database, no API calls, no side effects.
 */

// ---------------------------------------------------------------------------
// In-memory mock state
// ---------------------------------------------------------------------------

let contractors = [
  { id: 'contractor-a', zipCodes: ['29577', '29588'] },
  { id: 'contractor-b', zipCodes: ['29577'] },
  { id: 'contractor-c', zipCodes: ['29577', '29579'] },
  { id: 'contractor-d', zipCodes: ['29579'] },
];

// Simulates the ContractorZipCount table: key = `${contractorId}:${zipCode}`
const zipCountTable: { [key: string]: number } = {};

function resetCounts() {
  for (const key of Object.keys(zipCountTable)) {
    delete zipCountTable[key];
  }
}

// ---------------------------------------------------------------------------
// Mock Prisma client (only the methods matchLeads uses)
// ---------------------------------------------------------------------------

const prisma = {
  contractor: {
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { zipCodes: { has: string } };
      orderBy: { id: string };
    }) => {
      const matches = contractors
        .filter((c) => c.zipCodes.includes(where.zipCodes.has))
        .sort((a, b) => a.id.localeCompare(b.id));
      return matches;
    },
  },

  $transaction: async (fn: (tx: any) => Promise<any>) => {
    const tx = {
      contractorZipCount: {
        findMany: async ({
          where,
        }: {
          where: { zipCode: string; contractorId: { in: string[] } };
        }) => {
          return where.contractorId.in
            .map((id) => {
              const key = `${id}:${where.zipCode}`;
              if (key in zipCountTable) {
                return {
                  contractorId: id,
                  zipCode: where.zipCode,
                  assignedCount: zipCountTable[key],
                };
              }
              return null;
            })
            .filter(Boolean);
        },

        upsert: async ({
          where,
          create,
          update,
        }: {
          where: {
            contractorId_zipCode: { contractorId: string; zipCode: string };
          };
          create: {
            contractorId: string;
            zipCode: string;
            assignedCount: number;
          };
          update: { assignedCount: { increment: number } };
        }) => {
          const key = `${where.contractorId_zipCode.contractorId}:${where.contractorId_zipCode.zipCode}`;
          if (!(key in zipCountTable)) {
            zipCountTable[key] = create.assignedCount;
          } else {
            zipCountTable[key] += update.assignedCount.increment;
          }
          return {
            contractorId: where.contractorId_zipCode.contractorId,
            zipCode: where.contractorId_zipCode.zipCode,
            assignedCount: zipCountTable[key],
          };
        },
      },
    };
    return fn(tx);
  },
};

// ---------------------------------------------------------------------------
// matchLeads (copy of the new implementation, using our mock prisma)
// ---------------------------------------------------------------------------

async function matchLeads(leads: any[]) {
  const contractorLeadsMap: { [key: string]: any[] } = {};

  for (const lead of leads) {
    try {
      const zip = lead.zip?.substring(0, 5);
      if (!zip) {
        console.warn(`Lead ${lead.id} has no zip code, skipping`);
        continue;
      }

      const matchedContractors = await prisma.contractor.findMany({
        where: { zipCodes: { has: zip } },
        orderBy: { id: 'asc' },
      });

      if (matchedContractors.length === 0) continue;

      const contractor = await prisma.$transaction(async (tx: any) => {
        const contractorIds = matchedContractors.map((c) => c.id);

        const existingCounts = await tx.contractorZipCount.findMany({
          where: {
            zipCode: zip,
            contractorId: { in: contractorIds },
          },
        });

        const countMap = new Map(
          existingCounts.map((c: any) => [c.contractorId, c.assignedCount])
        );

        let bestContractor = matchedContractors[0];
        let bestCount = countMap.get(matchedContractors[0].id) ?? 0;

        for (let i = 1; i < matchedContractors.length; i++) {
          const count = countMap.get(matchedContractors[i].id) ?? 0;
          if (count < bestCount) {
            bestCount = count;
            bestContractor = matchedContractors[i];
          }
        }

        await tx.contractorZipCount.upsert({
          where: {
            contractorId_zipCode: {
              contractorId: bestContractor.id,
              zipCode: zip,
            },
          },
          create: {
            contractorId: bestContractor.id,
            zipCode: zip,
            assignedCount: 1,
          },
          update: {
            assignedCount: { increment: 1 },
          },
        });

        return bestContractor;
      });

      if (!contractorLeadsMap[contractor.id]) {
        contractorLeadsMap[contractor.id] = [];
      }
      contractorLeadsMap[contractor.id].push(lead);
    } catch (error) {
      console.error(`Failed to match lead ${lead.id}, skipping:`, error);
      continue;
    }
  }

  return contractorLeadsMap;
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.error(`  ✗ ${label}`);
      failed++;
    }
  }

  // ---- Test 1: Three-way contested zip distributes evenly ----
  console.log('\nTest 1: Three contractors compete for zip 29577');
  resetCounts();

  const leads1 = Array.from({ length: 6 }, (_, i) => ({
    id: `lead-${i + 1}`,
    zip: '29577',
  }));

  const result1 = await matchLeads(leads1);

  assert(result1['contractor-a']?.length === 2, 'contractor-a gets 2 leads');
  assert(result1['contractor-b']?.length === 2, 'contractor-b gets 2 leads');
  assert(result1['contractor-c']?.length === 2, 'contractor-c gets 2 leads');

  // ---- Test 2: Two-way contested zip ----
  console.log('\nTest 2: Two contractors compete for zip 29579');
  resetCounts();

  const leads2 = Array.from({ length: 5 }, (_, i) => ({
    id: `lead-2x-${i + 1}`,
    zip: '29579',
  }));

  const result2 = await matchLeads(leads2);

  assert(result2['contractor-c']?.length === 3, 'contractor-c gets 3 leads');
  assert(result2['contractor-d']?.length === 2, 'contractor-d gets 2 leads');

  // ---- Test 3: Uncontested zip goes to the sole contractor ----
  console.log('\nTest 3: Only contractor-a serves zip 29588');
  resetCounts();

  const leads3 = Array.from({ length: 3 }, (_, i) => ({
    id: `lead-3x-${i + 1}`,
    zip: '29588',
  }));

  const result3 = await matchLeads(leads3);

  assert(result3['contractor-a']?.length === 3, 'contractor-a gets all 3 leads');
  assert(!result3['contractor-b'], 'contractor-b gets nothing');

  // ---- Test 4: Leads with no zip are skipped ----
  console.log('\nTest 4: Leads with missing zip are skipped');

  const leads4 = [
    { id: 'no-zip-1', zip: null },
    { id: 'no-zip-2', zip: undefined },
    { id: 'no-zip-3' },
  ];

  const result4 = await matchLeads(leads4);
  const totalAssigned = Object.values(result4).flat().length;
  assert(totalAssigned === 0, 'No leads assigned when zip is missing');

  // ---- Test 5: Unmatched zip produces no assignments ----
  console.log('\nTest 5: Zip with no contractors');

  const leads5 = [{ id: 'orphan-1', zip: '00000' }];
  const result5 = await matchLeads(leads5);
  const totalOrphans = Object.values(result5).flat().length;
  assert(totalOrphans === 0, 'No leads assigned for unknown zip');

  // ---- Test 6: Counter persists across batches ----
  console.log('\nTest 6: Counter persists across consecutive batches');
  resetCounts();

  const batch1 = [{ id: 'batch1-1', zip: '29577' }];
  const batch2 = [{ id: 'batch2-1', zip: '29577' }];
  const batch3 = [{ id: 'batch3-1', zip: '29577' }];

  const r1 = await matchLeads(batch1);
  const r2 = await matchLeads(batch2);
  const r3 = await matchLeads(batch3);

  const assigned1 = Object.keys(r1).find((k) => r1[k].length > 0)!;
  const assigned2 = Object.keys(r2).find((k) => r2[k].length > 0)!;
  const assigned3 = Object.keys(r3).find((k) => r3[k].length > 0)!;

  assert(
    assigned1 !== assigned2 && assigned2 !== assigned3,
    'Each consecutive batch goes to a different contractor'
  );
  console.log(`  Rotation: ${assigned1} → ${assigned2} → ${assigned3}`);

  // ---- Test 7: NEW CONTRACTOR joins and catches up naturally ----
  console.log('\nTest 7: New contractor joins mid-stream and catches up');
  resetCounts();

  // Assign 3 leads across a/b/c for zip 29577 (1 each)
  const preLeads = Array.from({ length: 3 }, (_, i) => ({
    id: `pre-${i + 1}`,
    zip: '29577',
  }));
  await matchLeads(preLeads);

  // Now contractor-e joins zip 29577
  contractors.push({ id: 'contractor-e', zipCodes: ['29577'] });

  // Next lead should go to contractor-e (count = 0, everyone else = 1)
  const newLead = [{ id: 'post-join-1', zip: '29577' }];
  const r7 = await matchLeads(newLead);

  assert(
    r7['contractor-e']?.length === 1,
    'New contractor gets the next lead (has 0 count)'
  );

  // Remove contractor-e for subsequent tests
  contractors = contractors.filter((c) => c.id !== 'contractor-e');

  // ---- Test 8: Contractor LEAVES — distribution self-heals ----
  console.log('\nTest 8: Contractor leaves and distribution rebalances');
  resetCounts();

  // Give each of a/b/c 2 leads for zip 29577
  const setupLeads = Array.from({ length: 6 }, (_, i) => ({
    id: `setup-${i + 1}`,
    zip: '29577',
  }));
  await matchLeads(setupLeads);

  // Now contractor-b drops zip 29577
  const origB = contractors.find((c) => c.id === 'contractor-b')!;
  origB.zipCodes = [];

  // Next 4 leads should split between a and c (2 each)
  const postLeaveLeads = Array.from({ length: 4 }, (_, i) => ({
    id: `post-leave-${i + 1}`,
    zip: '29577',
  }));
  const r8 = await matchLeads(postLeaveLeads);

  assert(r8['contractor-a']?.length === 2, 'contractor-a gets 2 after b leaves');
  assert(r8['contractor-c']?.length === 2, 'contractor-c gets 2 after b leaves');
  assert(!r8['contractor-b'], 'contractor-b gets nothing after leaving');

  // Restore contractor-b
  origB.zipCodes = ['29577'];

  // ---- Test 9: Contractor RETURNS — catches up from behind ----
  console.log('\nTest 9: Contractor returns and catches up');
  resetCounts();

  // Give a and c 3 leads each for zip 29577, skip b
  const origB2 = contractors.find((c) => c.id === 'contractor-b')!;
  origB2.zipCodes = []; // b is gone

  const headStartLeads = Array.from({ length: 6 }, (_, i) => ({
    id: `headstart-${i + 1}`,
    zip: '29577',
  }));
  await matchLeads(headStartLeads);
  // a=3, c=3, b=0 (not participating)

  // b comes back
  origB2.zipCodes = ['29577'];

  // Next 3 leads should all go to b (count 0 vs a=3, c=3)
  const catchupLeads = Array.from({ length: 3 }, (_, i) => ({
    id: `catchup-${i + 1}`,
    zip: '29577',
  }));
  const r9 = await matchLeads(catchupLeads);

  assert(
    r9['contractor-b']?.length === 3,
    'Returning contractor catches up with 3 consecutive leads'
  );
  assert(!r9['contractor-a'], 'contractor-a gets nothing while b catches up');
  assert(!r9['contractor-c'], 'contractor-c gets nothing while b catches up');

  // ---- Test 10: Mixed zips in one batch ----
  console.log('\nTest 10: Batch with mixed zip codes');
  resetCounts();

  const mixedLeads = [
    { id: 'mix-1', zip: '29577' },
    { id: 'mix-2', zip: '29579' },
    { id: 'mix-3', zip: '29577' },
    { id: 'mix-4', zip: '29588' },
    { id: 'mix-5', zip: '29579' },
    { id: 'mix-6', zip: '29577' },
  ];

  const r10 = await matchLeads(mixedLeads);

  // 29577: a, b, c → 1 each
  // 29579: c, d → 1 each
  // 29588: a only → 1
  const totalLeads = Object.values(r10).flat().length;
  assert(totalLeads === 6, 'All 6 mixed-zip leads are assigned');
  assert(
    (r10['contractor-a']?.length ?? 0) >= 1,
    'contractor-a gets at least 1 (sole owner of 29588)'
  );

  // ---- Summary ----
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});