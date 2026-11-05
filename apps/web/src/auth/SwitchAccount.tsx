import { useAuth } from "./useAuth";
import { useTranslation } from "../i18n/useTranslation";
import { Button } from "../components/ui/Foundation";
import { ErrorFeedback } from "../components/ErrorFeedback";
export function SwitchAccount(){const {logout,loading,error}=useAuth();const {t}=useTranslation();return <><ErrorFeedback error={error}/><Button disabled={loading} variant="quiet" onClick={()=>{if(window.confirm(t("Shell.logoutConfirm")))void logout().catch(()=>{});}}>{t("Shell.logout")}</Button></>;}
