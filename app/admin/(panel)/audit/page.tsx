import {requireAdmin} from "@/lib/admin";
import {defaultAuditFilters} from "@/lib/admin-operations";
import {loadAdminAudit} from "./actions";
import AuditManager from "@/components/admin/AuditManager";
export const metadata={title:'Audit Log'};
export default async function Page(){await requireAdmin();return <AuditManager initial={await loadAdminAudit(defaultAuditFilters)}/>;}
