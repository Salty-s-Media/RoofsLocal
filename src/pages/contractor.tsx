import ContractorRegistration from "../../_components/home/contractor/ContractorRegistration";
export default function Contractor() {
  return (
    <div className="min-h-screen w-full justify-center pt-6 flex flex-col bg-blk">
      <h1 className="text-center text-3xl font-bold p-6">
        Sign Up to Buy Leads by Area Code
      </h1>
      <br></br>
      <ContractorRegistration />
    </div>
  );
}
