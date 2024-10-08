export default function HowToKey() {
  return (
    <div className="flex flex-col mt-4 mb-4">
      <h2 className="text-2xl mb-2 font-semibold">
        Watch this short tutorial on how to get your Hubspot API key.
      </h2>
      <p className="max-w-md">
        After creating your app, be sure to click show token, and then copy and
        paste that full value into the input field down below.
      </p>
      <br></br>
      <video src="/howto.mp4" className="max-w-[360px]" controls />
      <br></br>
    </div>
  );
}
