import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";

interface AllocationItem {
  label: string;
  value: number;
}

interface AllocationChartProps {
  data: AllocationItem[];
}

export const ALLOCATION_COLORS = ["#2962ff", "#00c074", "#f5a524", "#f6465d", "#7f8596"];

export function AllocationChart({ data }: AllocationChartProps) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={3}
            stroke="rgba(255,255,255,0.08)"
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
