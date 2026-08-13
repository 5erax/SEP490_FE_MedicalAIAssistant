import { useContext } from "react";
import { ServiceCreditContext } from "./serviceCreditContext";

export function useServiceCredit() {
  const context = useContext(ServiceCreditContext);
  if (!context) {
    throw new Error("useServiceCredit must be used inside ServiceCreditProvider");
  }
  return context;
}
