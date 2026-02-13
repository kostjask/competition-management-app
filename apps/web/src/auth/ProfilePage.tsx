import { format } from "date-fns";
import { useAuth } from "./useAuth";

export function ProfilePage() {
  const { user, loading, error } = useAuth();

  if (loading && !user) {
    return <div className="p-6">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-6">Unable to load profile.</div>;
  }

  const created = format(new Date(user.createdAt), "PPP");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between px-2">
        <div>
          <p className="text-sm font-medium text-slate-500">Account</p>
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">Joined {created}</p>
        </div>
        
        <button
          type="button"
        //   onClick={}  edit user profile functionality can be added here
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 cursor-pointer"
        >
          Edit
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Personal info</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Admin</dt>
              <dd className="font-medium text-slate-900">{user.isAdmin ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Roles</h2>
          {user.roles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No roles assigned yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {user.roles.map((assignment) => (
                <li key={assignment.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{assignment.role.name}</p>
                  <p className="text-xs text-slate-600">
                    {assignment.event ? assignment.event.name : "No event"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
