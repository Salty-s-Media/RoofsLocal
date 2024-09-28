import ContractorRegistration from "../../_components/home/contractor/ContractorRegistration";
export default function Contractor() {
  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6 bg-blk">
      <h1 className="text-center text-3xl font-bold p-6 ">
        Sign Up to Buy Leads by Area Code
      </h1>
      <ContractorRegistration />
    </div>
  );
}
