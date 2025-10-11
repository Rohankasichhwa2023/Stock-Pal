import React, { useState, useEffect, useRef } from 'react';
import './Nepse.css';

const Nepse = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('3M');
    const canvasRef = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (data.length > 0) {
            drawChart();
        }
    }, [data, timeRange]);

    const fetchData = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/nepse/');
            const result = await response.json();
            setData(result.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const filterDataByRange = () => {
        if (data.length === 0) return [];

        const now = new Date();
        const startDate = new Date();

        switch (timeRange) {
            case '1W':
                startDate.setDate(now.getDate() - 7);
                break;
            case '3M':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6M':
                startDate.setMonth(now.getMonth() - 6);
                break;
            case '1Y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case '5Y':
                startDate.setFullYear(now.getFullYear() - 5);
                break;
            case 'ALL':
                return data;
            default:
                startDate.setFullYear(now.getFullYear() - 1);
        }

        return data.filter(d => new Date(d.Date) >= startDate);
    };

    const drawChart = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const filteredData = filterDataByRange();
        if (filteredData.length === 0) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        const chartHeight = height - padding * 2;
        const chartWidth = width - padding * 2;

        ctx.clearRect(0, 0, width, height);

        // Get price range
        const prices = filteredData.map(d => d.Close);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceRange = maxPrice - minPrice;

        // Draw axes
        ctx.beginPath();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Y-axis label (Price)
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.restore();

        // X-axis label (Date)
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';

        // Y-axis ticks
        const yTicks = 5;
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        for (let i = 0; i <= yTicks; i++) {
            const y = padding + (i / yTicks) * chartHeight;
            const priceLabel = (maxPrice - (i / yTicks) * priceRange).toFixed(2);
            ctx.fillText(priceLabel, 5, y + 3);
            ctx.beginPath();
            ctx.strokeStyle = '#eee';
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw line chart
        ctx.beginPath();
        ctx.strokeStyle = '#2CB74B';
        ctx.lineWidth = 2;

        filteredData.forEach((point, index) => {
            const x = padding + (index / (filteredData.length - 1)) * chartWidth;
            const y = padding + ((maxPrice - point.Close) / priceRange) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill gradient
        ctx.lineTo(padding + chartWidth, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, '#C6F1DB');
        gradient.addColorStop(1, '#E8F8EF');
        ctx.fillStyle = gradient;
        ctx.fill();

        // X-axis ticks based on time range
        drawXAxisTicks(ctx, filteredData, timeRange, width, height, padding, chartWidth);

        // Mouse interaction
        canvas.onmousemove = (e) => handleMouseMove(e, filteredData, canvas, padding, chartWidth, chartHeight, maxPrice, minPrice, priceRange);
        canvas.onmouseleave = () => {
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            drawChart(); // Reset chart when mouse leaves
        };
    };

    const drawXAxisTicks = (ctx, filteredData, range, width, height, padding, chartWidth) => {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';

        const dates = filteredData.map(d => new Date(d.Date));
        const total = filteredData.length;
        let interval = 1;
        let formatter;

        switch (range) {
            case '1W':
                interval = Math.max(1, Math.floor(total / 7));
                formatter = d => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                break;
            case '3M':
                interval = Math.max(1, Math.floor(total / 3));
                formatter = d => d.toLocaleDateString('en-US', { month: 'short' });
                break;
            case '6M':
                interval = Math.max(1, Math.floor(total / 6));
                formatter = d => d.toLocaleDateString('en-US', { month: 'short' });
                break;
            case '1Y':
                interval = Math.max(1, Math.floor(total / 12));
                formatter = d => d.toLocaleDateString('en-US', { month: 'short' });
                break;
            case '5Y':
                interval = Math.max(1, Math.floor(total / 5));
                formatter = d => d.getFullYear();
                break;
            case 'ALL':
                interval = Math.max(1, Math.floor(total / 6));
                formatter = d => d.getFullYear();
                break;
            default:
                formatter = d => d.toLocaleDateString('en-US');
        }

        for (let i = 0; i < total; i += interval) {
            const x = padding + (i / (total - 1)) * chartWidth;
            const label = formatter(dates[i]);
            ctx.fillText(label, x - 10, height - padding + 20);
        }
    };

    const handleMouseMove = (e, filteredData, canvas, padding, chartWidth, chartHeight, maxPrice, minPrice, priceRange) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Only draw if inside chart area
        if (mouseX < padding || mouseX > padding + chartWidth || mouseY < padding || mouseY > canvas.height - padding) return;

        // Show tooltip for nearest data point (optional)
        const dataIndex = Math.round(((mouseX - padding) / chartWidth) * (filteredData.length - 1));
        const point = filteredData[dataIndex];
        if (!point) return;

        const tooltip = tooltipRef.current;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 60}px`;
        tooltip.style.top = `${e.clientY - 60}px`;
        const date = new Date(point.Date);
        tooltip.innerHTML = `
        <div class="tooltip-date">${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="tooltip-price">NEPSE: ${point.Close.toFixed(2)}</div>`;

        // Redraw chart
        drawChart();

        // Draw crosshair exactly at mouse
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.setLineDash([5, 5]);

        // Vertical line
        ctx.moveTo(mouseX, padding);
        ctx.lineTo(mouseX, canvas.height - padding);

        // Horizontal line
        ctx.moveTo(padding, mouseY);
        ctx.lineTo(canvas.width - padding, mouseY);

        ctx.stroke();
        ctx.setLineDash([]);
    };


    const latestData = data.length > 0 ? data[data.length - 1] : null;
    const currentPrice = latestData ? latestData.Close : 0;
    const priceChange = latestData ? latestData.Change : 0;
    const percentChange = latestData ? latestData['Per Change (%)'] : 0;

    if (loading) return <div className="nepse-loading">Loading...</div>;

    return (
        <div className="nepse-container">
            <div className="nepse-header">
                <div className="nepse-title"><h1>NEPSE</h1></div>
                <div className="nepse-date">CLOSE PRICE</div>
            </div>

            <div className="nepse-price-section">
                <div className="nepse-price">{currentPrice.toFixed(2)}</div>
                <div className="nepse-change">
                    <span className="change-value">{priceChange}</span>
                    <span className="change-percent">{percentChange}%</span>
                </div>
            </div>

            <div className="nepse-controls">
                <div className="time-range-buttons">
                    {['1W', '3M', '6M', '1Y', '5Y', 'ALL'].map(range => (
                        <button
                            key={range}
                            className={`time-btn ${timeRange === range ? 'active' : ''}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container">
                <canvas ref={canvasRef} width={1000} height={400} className="price-chart" />
            </div>

            <div ref={tooltipRef} className="tooltip"></div>
        </div>
    );
};

export default Nepse;
