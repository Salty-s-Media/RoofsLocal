export default function Testing() {
  const handleReq = async () => {
    try {
      const resp = await fetch("/api/twilio/sendSMS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (resp.status === 200) {
        const responseData = await resp.json();
        console.log(responseData);
      }
    } catch (error) {
      console.error("Failed to create sms:", error);
    }
  };

  return (
    <div className="min-h-screen w-full justify-center flex flex-col items-center">
      <h1 className="font-bold text-3xl">Testing Call</h1>
      <br></br>
      <button
        onClick={() => handleReq()}
        className="bg-gray-500 hover:bg-gray-600 max-w-[200px] text-white font-bold py-2 px-4 rounded"
      >
        Test Calling Function
      </button>
    </div>
  );
}
