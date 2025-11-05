import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';

export default function PredictionCard({ symbol }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/api/prediction/${symbol}/`)
            .then(r => r.json())
            .then(j => setData(j))
            .catch(e => console.error(e));
    }, [symbol]);

    if (!data) return <div>Loading...</div>;

    const dates = data.series.map(s => s.date);
    const actual = data.series.map(s => s.actual);
    const pred = data.series.map(s => s.predicted);

    const chartData = {
        labels: dates,
        datasets: [
            { label: 'Actual', data: actual, fill: false },
            { label: 'Predicted', data: pred, fill: false }
        ]
    };

    return (
        <div>
            <h3>{symbol} prediction</h3>
            <p>Next-day predicted close: <strong>{data.next_day_price ?? 'N/A'}</strong></p>
            <p>Movement: <strong>{data.movement ?? 'N/A'}</strong></p>
            <Line data={chartData} />
        </div>
    );
}
