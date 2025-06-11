# **App Name**: ClusterVision

## Core Features:

- Data Upload: Allow the user to upload a distance matrix in JSON format, ensuring that keys `from`, `to`, and `distance` are handled appropriately.
- Parameter Input: Provide input fields for setting the minimum and maximum number of clusters, and the minimum cluster size.
- Clustering Algorithm: Call C# API which implement a deterministic clustering algorithm respecting the defined constraints.
- Cluster Display: Display the resulting clusters in a readable format, like 'Cluster 1: 4, 1, 9; Cluster 2: 0, 5, 8; Cluster 3: 2, 3, 6, 7'.
- Constraint Validation: Show warning if constraints are impossible to satisfy, and suggest parameter adjustments. The UI explains data limitations that prevent solutions.

## Style Guidelines:

- Primary color: Desaturated blue (#6699CC) to evoke trust and analytical thinking; HSL(210, 33%, 60%).
- Background color: Very light grey (#F0F0F0) for a neutral canvas; HSL(0, 0%, 94%).
- Accent color: Muted orange (#D98A3F) to highlight key elements; HSL(26, 54%, 55%).
- Font: 'Inter' sans-serif for headlines and body text due to its clean and modern appearance.