import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';

interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  zipCodes: string[];
  pricePerLead: number;
}

export default function Admin() {
  const [actionActive, setActionActive] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [show, setShow] = useState(false);
  const [users, setUsers] = useState<Partial<Contractor[]>>([]);
  const [currentUser, setCurrentUser] = useState<Contractor | null>(null);
  const [updated, setUpdated] = useState(false);

  const router = useRouter();

  useEffect(() => {
    console.log('Current User is', currentUser);
  }, [currentUser]);

  const loginAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/user/admin/check-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: data.akey, rkey: data.rkey }),
      });

      if (response.ok) {
        setAuthed(true);

        setTimeout(() => {}, 1000);

        getUsers();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Admin login error ', error);
    }
  };

  const getUsers = async () => {
    const res = await fetch('/api/user/admin/get-all');
    const data = await res.json();
    if (res.ok) setUsers(data?.contractors);
  };

  const changePrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const price = parseFloat(data.price as string);
    const userid = data.uid as string;

    console.log('Price:', price, 'User ID:', userid);

    const res = await fetch('/api/user/admin/update-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid, price }),
    });

    if (res.ok) {
      const updatedUser: Contractor = await res.json();
      setCurrentUser(updatedUser);

      setUpdated(true);

      setTimeout(() => {
        setUpdated(false);

        setActionActive(false);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col mt-[125px] mb-4">
      {!authed ? (
        <div className="w-full items-center justify-center flex flex-col">
          <form
            className="min-w-[320px] bg-white p-4 rounded-md"
            onSubmit={loginAdmin}
          >
            <h1 className="text-2xl font-bold text-left mb-2 text-blk">
              Admin Login
            </h1>
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
                maxLength={30}
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
                  maxLength={30}
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
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">User List</h2>
          <table className="w-full border-collapse border-2 border-blk bg-white text-blk p-4 rounded-md">
            <thead>
              <tr className="bg-acc2">
                <th className="border p-2">Name</th>
                <th className="border p-2">Company</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Zip Codes</th>
                <th className="border p-2">Price Per Lead</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user?.id} className="border">
                  <td className="border p-2">
                    {user?.firstName} {user?.lastName}
                  </td>
                  <td className="border p-2">{user?.company}</td>
                  <td className="border p-2">{user?.email}</td>
                  <td className="border p-2">{user?.phone}</td>

                  <td className="text-blk border p-2">
                    {user!.zipCodes?.slice(0, 10).join(', ')}
                    {user!.zipCodes.length > 10 &&
                      `, +${user!.zipCodes.length - 10} more`}
                  </td>
                  {/* TODO: THIS SHOULD AUTO UPDATE WITH THE RESULT OF update-price.ts */}
                  <td className="border p-2">{user?.pricePerLead}</td>
                  <td className="border p-2">
                    <div
                      onClick={() => {
                        setActionActive(!actionActive);
                        if (user) {
                          setCurrentUser(user as Contractor);
                        }
                      }}
                      className="bg-blue-500 text-white text-center p-1 rounded cursor-pointer"
                    >
                      Edit
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {currentUser && actionActive ? (
            <>
              {updated ? (
                <p className="m-4 bg-white text-blk p-4 rounded-md">
                  Price Updated Successfully.
                </p>
              ) : (
                <form
                  onSubmit={changePrice}
                  className="mt-4 p-4 border-2 rounded max-w-md"
                  id="updatePrice"
                >
                  <h3 className="text-lg font-bold">
                    Update Price for {currentUser.firstName}{' '}
                    {currentUser.lastName}
                  </h3>
                  <input
                    id="price"
                    name="price"
                    type="text"
                    placeholder="New Price"
                    maxLength={30}
                    className="border p-2 w-full text-blk rounded-md mt-2 mb-2"
                    defaultValue={currentUser.pricePerLead}
                  />
                  <input
                    type="text"
                    value={currentUser.id}
                    name="uid"
                    hidden
                    readOnly
                  />
                  <button
                    type="submit"
                    className="mt-2 bg-blue-500 text-white p-2 rounded w-full"
                  >
                    Update Price
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="m-4 bg-white text-blk p-4 rounded-md">
              Action Inactive. Select &apos;Edit&apos; to make changes to a
              contractor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
