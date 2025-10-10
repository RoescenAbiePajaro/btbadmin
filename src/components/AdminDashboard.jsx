import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [clicks, setClicks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchData = async () => {
    const res = await fetch(`http://localhost:5000/api/clicks?page=${page}&limit=${limit}`);
    const data = await res.json();
    setClicks(data.clicks);
    setTotal(data.total);
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4">Admin</h2>
          <ul>
            <li className="mb-2">Dashboard Analytics</li>
            <li className="mb-2">Guest Navigation</li>
          </ul>
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-red-600 py-2 px-4 rounded-lg hover:bg-red-500"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl mb-6">Guest Click Analytics</h1>

        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="min-w-full text-left">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2">Button</th>
                <th className="px-4 py-2">Page</th>
                <th className="px-4 py-2">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {clicks.map((click, idx) => (
                <tr key={idx} className="border-t border-gray-700">
                  <td className="px-4 py-2">{click.button}</td>
                  <td className="px-4 py-2">{click.page}</td>
                  <td className="px-4 py-2">
                    {new Date(click.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-6 gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
