import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  zipCodes: string[];
  boughtZipCodes: string[];
  stripeId: string;
  password: string;
  sessionId: string;
  stripeSessionId?: string;
  pricePerLead: number;
  sessionExpiry: Date;
  verificationToken: string;
  resetToken?: string;
  isVerified: boolean;
  phoneVerified: boolean;
  hubspotKey?: string;
  ghlKey?: string;
  ghlLocationId?: string;
  ghlContactId?: string;
  ghlPipelineId: string;
  ghlPipelineStageId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Users {
  users: string[];
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [show, setShow] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState<Partial<Contractor>>({});

  const router = useRouter();

  const loginAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (!data) return;

    const akey = data.akey as string;
    const rkey = data.rkey as string;

    try {
      const response = await fetch('/api/user/admin/check-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: akey,
          rkey: rkey,
        }),
      });

      const result = await response.json();

      if (response.status === 200) {
        setAuthed(true);
      } else {
        console.error('Not Authorized', result.error);
        router.push('/');
      }
    } catch (error) {
      console.error('Admin login error ', error);
    }
  };

  const getUsers = async () => {
    const res = await fetch('/api/user/admin/get-all');

    const data = await res.json();

    if (res.ok) {
      setUsers(data.users);
    } else {
      console.error('Error getting users: ', data.error);
    }
  };

  const changePrice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    event.currentTarget.reset();

    if (!formData) return;

    const data = Object.fromEntries(formData.entries());

    const res = await fetch('/api/user/admin/update-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: currentUser.id,
        price: data.price,
      }),
    });

    const result = await res.json();

    if (res.status === 200) {
      setCurrentUser(result.user);
    } else {
      console.error('Error updating price: ', result.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col my-6 mx-6 mt-[125px]">
      <h1 className="text-2xl font-bold text-left mb-2 text-white">
        Welcome, Admin
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-2 text-blk">
          Admin Login
        </h1>
        <p className="text-center text-gray-700 mb-4">
          Please provide the admin login key.
        </p>
        <form onSubmit={loginAdmin}>
          <div className="mb-4">
            <label
              htmlFor="akey"
              className="block text-sm font-medium text-gray-700"
            >
              Main Key
            </label>
            <input
              id="akey"
              name="akey"
              type="text"
              placeholder="Main Key"
              className="text-blk mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
            />

            <div className="relative w-full">
              <label
                htmlFor="key"
                className="block text-sm font-medium text-gray-700 mt-4"
              >
                Secondary Key
              </label>
              <input
                id="rkey"
                name="rkey"
                type={show ? 'text' : 'password'}
                placeholder="Secondary Key"
                className="text-blk mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 top-6 right-3 flex items-center text-gray-500"
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="flex justify-between space-x-2">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-acc2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 hover:bg-acc1 ease-in-out"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
      {authed && (
        <div>
          <h1>Admin Dashboard</h1>
          <div>
            <h2>User List</h2>
            <button onClick={getUsers}>Get Users</button>
            <br></br>

            <div>
              <h2>Users</h2>
            </div>
          </div>
          <form
            onSubmit={changePrice}
            className="bg-darkG rounded-md p-8 max-w-[512px]"
          >
            <h1 className="mb-4 font-bold text-2xl">
              Update Price For User: {currentUser.id}
            </h1>
            <label htmlFor="price" className="text-md font-bold text-white">
              Price Per Lead
            </label>
            <input
              type="text"
              name="price"
              className="mt-1 w-full border-blue-300 shadow-sm sm:text-sm rounded-md text-blk"
            />
            <input type="text" name="userId" value={currentUser.id} hidden />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white text-center font-bold py-2 px-4 rounded mt-8"
            >
              Update Price Per Lead
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
