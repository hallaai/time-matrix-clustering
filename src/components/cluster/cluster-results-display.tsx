
"use client";

import type { ClusteringResult, ClusterMetric } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info, LineChart } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip, // Added ChartTooltip import
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ClusterResultsDisplayProps {
  results: ClusteringResult | null;
  isProcessing: boolean;
}

const membersChartConfig = {
  members: {
    label: "Members",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const metricsChartConfig = {
  totalIntraClusterDistance: {
    label: "Total Intra-Cluster Distance",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export function ClusterResultsDisplay({ results, isProcessing }: ClusterResultsDisplayProps) {
  if (isProcessing) {
    return null;
  }

  if (!results) {
    return (
      <Card className="w-full max-w-lg mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <Info className="mr-2 h-5 w-5" />
            <p>Upload data and run clustering to see results here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chosenClustersChartData = results.chosenClusters && results.chosenClusters.length > 0
    ? results.chosenClusters.map(cluster => ({
        name: `Cluster ${cluster.id}`,
        members: cluster.members.length,
      }))
    : [];

  // Filter out metrics where distance is Infinity for cleaner chart display
  const metricsChartData = results.allMetrics
    ? results.allMetrics
        .filter(metric => metric.totalIntraClusterDistance !== Infinity && metric.numberOfValidClusters > 0)
        .map(metric => ({
            k: metric.k,
            totalIntraClusterDistance: parseFloat(metric.totalIntraClusterDistance.toFixed(2)), // Keep some precision
            chosen: metric.k === results.chosenK ? 'Chosen K' : 'Other K'
        })).sort((a,b) => a.k - b.k)
    : [];


  return (
    <div className="w-full max-w-4xl mt-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Clustering Output</CardTitle>
          {results.chosenClusters && results.chosenClusters.length > 0 && !results.error && (
              <CardDescription>Clustering process completed. Best solution found for k={results.chosenK || 'N/A'} clusters.</CardDescription>
          )}
          {results.error && (
              <CardDescription>An error occurred during processing.</CardDescription>
          )}
          {results.warning && !results.error && (
              <CardDescription>Process completed with warnings.</CardDescription>
          )}
          {(!results.chosenClusters || results.chosenClusters.length === 0) && !results.warning && !results.error && (
              <CardDescription>Process completed, but no clusters were formed satisfying the criteria.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {results.error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{results.error}</AlertDescription>
            </Alert>
          )}
          {results.warning && (
            <Alert variant="default" className="mb-4 border-yellow-500/50 text-yellow-700 dark:border-yellow-400/50 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription className="whitespace-pre-line">{results.warning}</AlertDescription>
            </Alert>
          )}

          {/* Display chosen clusters and their sizes */}
          {results.chosenClusters && results.chosenClusters.length > 0 && !results.error && (
            <div>
              <Alert variant="default" className="mb-6 border-green-500/50 text-green-700 dark:border-green-400/50 dark:text-green-300 [&>svg]:text-green-600 dark:[&>svg]:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <AlertTitle>Optimal Clustering Found (k={results.chosenK})</AlertTitle>
                <AlertDescription>The algorithm determined that {results.chosenK} clusters provide the best structure based on minimizing total intra-cluster distance.</AlertDescription>
              </Alert>
              
              <h3 className="font-semibold text-xl mb-3 text-foreground">Details for Chosen k={results.chosenK}:</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">Generated Clusters:</h4>
                    {results.chosenClusters.length > 0 ? (
                        <ul className="space-y-1 list-disc list-inside text-foreground mb-6 max-h-60 overflow-y-auto pr-2">
                        {results.chosenClusters.map(cluster => (
                            <li key={cluster.id}>
                            <span className="font-medium">Cluster {cluster.id}:</span> {cluster.members.join(', ')}
                            </li>
                        ))}
                        </ul>
                    ) : <p className="text-muted-foreground">No clusters formed for the chosen K.</p>}
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-foreground">Cluster Sizes (k={results.chosenK}):</h4>
                    {chosenClustersChartData.length > 0 ? (
                        <ChartContainer config={membersChartConfig} className="min-h-[200px] w-full">
                        <BarChart accessibilityLayer data={chosenClustersChartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis dataKey="members" allowDecimals={false} tickLine={false} axisLine={false} tickMargin={10} label={{ value: "Points", angle: -90, position: 'insideLeft', offset:0 }}/>
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                            <Bar dataKey="members" fill="var(--color-members)" radius={4}>
                            <LabelList dataKey="members" position="top" offset={8} className="fill-foreground" fontSize={12}/>
                            </Bar>
                        </BarChart>
                        </ChartContainer>
                    ) : <p className="text-muted-foreground">No chart data available.</p>}
                </div>
              </div>
            </div>
          )}
          
          {/* Handle case where no clusters were formed at all */}
          {(!results.chosenClusters || results.chosenClusters.length === 0) && !results.warning && !results.error && (
            <Alert variant="default" className="mb-4">
              <Info className="h-5 w-5" />
              <AlertTitle>No Clusters Formed</AlertTitle>
              <AlertDescription>The algorithm did not form any clusters satisfying the criteria for any tested K. This might happen with very sparse data or strict constraints. Consider adjusting parameters.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Display Clustering Quality Comparison Chart */}
      {results.allMetrics && metricsChartData.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
                <LineChart className="mr-3 h-7 w-7 text-primary"/>
                Clustering Quality Comparison
            </CardTitle>
            <CardDescription>
              This chart shows the Total Intra-Cluster Distance for different numbers of clusters (k).
              Lower values generally indicate better clustering, as points within each cluster are closer to their respective centers (medoids).
              The algorithm selected k={results.chosenK || "N/A"} as providing the optimal balance based on this metric from the tested range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metricsChartData.length > 0 ? (
                <ChartContainer config={metricsChartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={metricsChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis 
                        dataKey="k" 
                        name="Number of Clusters (k)" 
                        tickLine={false} 
                        tickMargin={10} 
                        axisLine={true}
                        label={{ value: "Number of Clusters (k)", position: 'insideBottom', offset: -15 }}
                    />
                    <YAxis 
                        dataKey="totalIntraClusterDistance" 
                        name="Total Intra-Cluster Distance"
                        tickLine={false} 
                        axisLine={true} 
                        tickMargin={10} 
                        label={{ value: "Total Intra-Cluster Distance", angle: -90, position: 'insideLeft', offset: 10 }}
                        domain={['dataMin - 10', 'dataMax + 10']}
                        allowDecimals={true}
                    />
                    <RechartsTooltip 
                        cursor={{ fill: 'hsla(var(--muted), 0.5)' }} 
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                <div className="p-2 bg-background border rounded shadow-lg text-sm">
                                    <p className="font-bold">k = {label}</p>
                                    <p style={{ color: metricsChartConfig.totalIntraClusterDistance.color }}>
                                        Distance: {data.totalIntraClusterDistance.toLocaleString()}
                                    </p>
                                    {data.k === results.chosenK && <p className="text-primary font-semibold">(Chosen k)</p>}
                                </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar 
                        dataKey="totalIntraClusterDistance" 
                        name="Total Intra-Cluster Distance" 
                        radius={4}
                    >
                        {metricsChartData.map((entry, index) => (
                            // @ts-ignore Recharts type issue with custom component in Bar
                            <rect key={`bar-${index}`} fill={entry.k === results.chosenK ? "hsl(var(--primary))" : "hsl(var(--chart-2))"} />
                        ))}
                         <LabelList dataKey="totalIntraClusterDistance" position="top" offset={8} className="fill-foreground" fontSize={10} formatter={(value: number) => value.toFixed(0)} />
                    </Bar>
                </BarChart>
                </ChartContainer>
            ) : (
                <p className="text-muted-foreground p-4 text-center">No metric data available to display comparison chart. This might occur if no valid clusters were formed for any k value tested.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

