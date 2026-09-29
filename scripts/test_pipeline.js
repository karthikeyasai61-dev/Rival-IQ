async function testAnalyzeEndpoint() {
  const workspaceId = 'mhjnmrsdDrDc4T0lVA95';
  console.log('Calling POST http://localhost:3000/api/analyze with Nike and Adidas datasets...');

  const res = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token-test',
    },
    body: JSON.stringify({
      workspaceId,
      datasetIds: [
        'e05208dc-a08c-407e-bd55-0d9a02e85177', // Nike user company dataset
        '7773b582-c7df-4983-91f9-e525a5edcef5', // Adidas competitor dataset
      ],
      companyName: 'Nike',
    }),
  });

  const status = res.status;
  console.log(`Response status: ${status}`);
  const data = await res.json();
  if (!res.ok) {
    console.error('Error:', data);
    return;
  }

  console.log('\n========================================');
  console.log('--- ANALYSIS RESULTS RETURNED ---');
  console.log('Analysis ID:', data.analysis?.id);
  console.log('Signals Detected:', data.analysis?.signalsDetected);
  console.log('Gaps Identified:', data.analysis?.gapsIdentified);
  console.log(`\n1. Competitor Improvements (${data.analysis?.competitorImprovements?.length || 0} items):`);
  (data.analysis?.competitorImprovements || []).forEach((item, i) => console.log(`   ${i+1}. [${item.competitor}] ${item.improvement}`));
  console.log(`\n2. Competitor Drawbacks & Vulnerabilities (${data.analysis?.competitorDrawbacks?.length || 0} items):`);
  (data.analysis?.competitorDrawbacks || []).forEach((item, i) => console.log(`   ${i+1}. [${item.competitor}] ${item.drawback}`));
  console.log(`\n3. Competitor Successes & Milestones (${data.analysis?.competitorSuccesses?.length || 0} items):`);
  (data.analysis?.competitorSuccesses || []).forEach((item, i) => console.log(`   ${i+1}. [${item.competitor}] ${item.success}`));
  console.log(`\n4. Sudden Hiring Analysis (${data.analysis?.hiringAnalysis?.length || 0} items):`);
  (data.analysis?.hiringAnalysis || []).forEach((item, i) => console.log(`   ${i+1}. [${item.competitor}] ${item.inferredCause}`));

  console.log('\n--- HEAD-TO-HEAD COMPARISON SUMMARY FOR SINGLE GRAPH ---');
  console.log('Our Company:', data.comparisonSummary?.ourCompany);
  console.log('Competitor Company:', data.comparisonSummary?.competitorCompany);
  console.log('Delta Metrics Table:');
  console.table(data.comparisonSummary?.deltaMetrics);
}

testAnalyzeEndpoint().catch(console.error);
