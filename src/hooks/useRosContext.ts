import { useContext } from "react";
import { RosContext } from "../context/RosContext";

export const useRosContext = () => {
  const context = useContext(RosContext);
  if (!context) {
    throw new Error("useRosContext must be used within a RosProvider");
  }
  return context;
};
