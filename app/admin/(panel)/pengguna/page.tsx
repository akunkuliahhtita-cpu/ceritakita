import {requireAdmin} from "@/lib/admin";
import {defaultUserFilters} from "@/lib/admin-operations";
import {loadAdminUsers} from "./actions";
import UsersManager from "@/components/admin/UsersManager";
export const metadata={title:'Pengguna'};
export default async function Page(){const {user}=await requireAdmin();return <UsersManager initial={await loadAdminUsers(defaultUserFilters)} actor={user.id}/>;}
