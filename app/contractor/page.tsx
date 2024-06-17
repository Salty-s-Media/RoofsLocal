import ContractorRegistration from "@/_components/home/contractor/ContractorRegistration";
export default function Contractor() {
  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <h1 className="text-center text-3xl font-bold p-6 text-gray-800">
        Buy Leads by Area Code
      </h1>

      <ContractorRegistration />
    </div>
  );
}
