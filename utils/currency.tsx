export const formatCurrency = (amount: number, currency: "USD" | "SAR") => {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } else {
    return (
      <span className="whitespace-nowrap inline-flex items-baseline gap-1">
        <span className="font-saudi-riyal text-[1.1em] text-inherit">&#xea;</span>
        {new Intl.NumberFormat("en-US", { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }).format(amount)}
      </span>
    );
  }
};
