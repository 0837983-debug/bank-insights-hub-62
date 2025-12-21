import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const regions = [
  { 
    region: "North", 
    branches: 45, 
    transactions: 52000, 
    volume: "$985M", 
    change: 8.5,
    changeYtd: 12.3,
    avgTransaction: "$18,942"
  },
  { 
    region: "South", 
    branches: 38, 
    transactions: 48000, 
    volume: "$912M", 
    change: -2.3,
    changeYtd: -1.8,
    avgTransaction: "$19,000"
  },
  { 
    region: "East", 
    branches: 52, 
    transactions: 61000, 
    volume: "$1.15B", 
    change: 12.1,
    changeYtd: 15.6,
    avgTransaction: "$18,852"
  },
  { 
    region: "West", 
    branches: 41, 
    transactions: 49500, 
    volume: "$935M", 
    change: 5.7,
    changeYtd: 8.2,
    avgTransaction: "$18,889"
  },
  { 
    region: "Central", 
    branches: 34, 
    transactions: 42000, 
    volume: "$798M", 
    change: 3.2,
    changeYtd: 5.1,
    avgTransaction: "$19,000"
  },
];

export const RegionalTable = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Regional Performance</h3>
        <Button variant="outline" size="sm">
          Export Data
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Region</TableHead>
              <TableHead className="text-right">Branches</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Avg Transaction</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.region} className="hover:bg-muted/50">
                <TableCell className="font-medium">{region.region}</TableCell>
                <TableCell className="text-right">{region.branches}</TableCell>
                <TableCell className="text-right">{region.transactions.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{region.volume}</TableCell>
                <TableCell className="text-right">{region.avgTransaction}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {region.change > 0 ? (
                      <ArrowUpIcon className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDownIcon className="w-4 h-4 text-destructive" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      region.change > 0 ? "text-success" : "text-destructive"
                    )}>
                      {region.change > 0 ? "+" : ""}{region.change}%
                      <span className="ml-1">
                        ({region.changeYtd > 0 ? "↑" : "↓"}{Math.abs(region.changeYtd)}%)
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm">
                    <ExternalLinkIcon className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
