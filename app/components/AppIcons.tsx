type IconProps = {
  className?: string;
};

function IconBase({
  className,
  children
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" />
    </IconBase>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5.5v5h5" />
      <path d="M5.2 10.5a7.5 7.5 0 1 1 .6 5.5" />
      <path d="M12 8v4.5l3 1.8" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H9" />
      <path d="m14 8 4 4-4 4M18 12H8" />
    </IconBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9H5.5A2.5 2.5 0 0 1 3 15.5v-10A2.5 2.5 0 0 1 5.5 3H17v4.5" />
      <path d="M15 12h5M16 12h.01" />
    </IconBase>
  );
}

export function IncomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v16M7 9l5-5 5 5" />
    </IconBase>
  );
}

export function ExpenseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v16M7 15l5 5 5-5" />
    </IconBase>
  );
}

export function ExchangeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 8h13l-3-3M19 16H6l3 3" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 10 5 5 5-5" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </IconBase>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m10 7 5 5-5 5" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
      <path d="M2 19h21" />
    </IconBase>
  );
}
