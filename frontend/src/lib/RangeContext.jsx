import { useState } from "react";
import { RangeContext } from "./range";

/*
  Global time range (in days) shared by the top bar picker and every query.
*/
export function RangeProvider({ children }) {
  const [days, setDays] = useState(7);
  return (
    <RangeContext.Provider value={{ days, setDays }}>
      {children}
    </RangeContext.Provider>
  );
}
