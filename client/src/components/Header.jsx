import React from "react";
import path from "../../public/unnamed-removebg-preview.png";

export default function Header() {
  return (
    <div className="lg:hidden sm:flex pt-8 px-4 w-full flex-nowrap items-center">
      <img
        src={path}
        alt="Patha Gamini"
        className="h-16 flex-shrink-0"
      />
      <p className="ml-1 whitespace-nowrap">
        Patha Gamini – Odisha Tourism
      </p>
    </div>
  );
}
