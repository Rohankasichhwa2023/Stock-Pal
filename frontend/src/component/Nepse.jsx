import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Nepse.css';

const Nepse = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('3M');
    const canvasRef = useRef(null);
    const tooltipRef = useRef(null);
    const hoverIndexRef = useRef(null); // store hover index without causing React re-renders

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (data.length > 0) {
            drawChart(); // initial draw
            attachListeners(); // attach listeners once after first draw
        }
        // cleanup listeners on unmount or when data changes
        return () => detachListeners();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, timeRange]);

    const fetchData = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/nepse/');
            const result = await response.json();
            setData(result.data || []);
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

    // drawChart optionally highlights hoverIndex (null = no overlay)
    const drawChart = (hoverIndex = null) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const filteredData = filterDataByRange();
        if (filteredData.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        const chartHeight = height - padding * 2;
        const chartWidth = width - padding * 2;

        ctx.clearRect(0, 0, width, height);

        // price range
        const prices = filteredData.map(d => +d.Close);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceRange = maxPrice - minPrice || 1;

        // axes
        ctx.beginPath();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // y ticks and grid
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

        // draw line path
        ctx.beginPath();
        ctx.strokeStyle = '#2CB74B';
        ctx.lineWidth = 2;

        filteredData.forEach((point, index) => {
            const x = padding + (index / Math.max(1, (filteredData.length - 1))) * chartWidth;
            const y = padding + ((maxPrice - point.Close) / priceRange) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // fill gradient under line
        ctx.lineTo(padding + chartWidth, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, '#C6F1DB');
        gradient.addColorStop(1, '#E8F8EF');
        ctx.fillStyle = gradient;
        ctx.fill();

        // x-axis ticks
        drawXAxisTicks(ctx, filteredData, timeRange, width, height, padding, chartWidth);

        // overlay: highlight hovered point if provided
        if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < filteredData.length) {
            const idx = hoverIndex;
            const px = padding + (idx / Math.max(1, (filteredData.length - 1))) * chartWidth;
            const py = padding + ((maxPrice - filteredData[idx].Close) / priceRange) * chartHeight;

            // vertical line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.setLineDash([5, 5]);
            ctx.moveTo(px, padding);
            ctx.lineTo(px, height - padding);
            ctx.stroke();
            ctx.setLineDash([]);

            // horizontal line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.moveTo(padding, py);
            ctx.lineTo(width - padding, py);
            ctx.stroke();

            // small circle on point
            ctx.beginPath();
            ctx.fillStyle = '#2CB74B';
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
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
            const x = padding + (i / Math.max(1, (total - 1))) * chartWidth;
            const label = formatter(dates[i]);
            ctx.fillText(label, x - 10, height - padding + 20);
        }
    };

    // ------- Mouse handling (single attachment) -------
    const onMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        // convert client coordinates to canvas coordinates (account for CSS scaling)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const padding = 60;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;

        // only continue if inside chart area
        if (mouseX < padding || mouseX > padding + chartWidth || mouseY < padding || mouseY > padding + chartHeight) {
            // hide tooltip and remove overlay
            hoverIndexRef.current = null;
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            drawChart(null);
            return;
        }

        const filteredData = filterDataByRange();
        if (filteredData.length === 0) return;

        // find nearest data index from scaled mouseX
        const ratio = (mouseX - padding) / Math.max(1, chartWidth);
        const dataIndex = Math.round(ratio * (filteredData.length - 1));
        const idx = Math.min(Math.max(dataIndex, 0), filteredData.length - 1);
        hoverIndexRef.current = idx;

        // show tooltip positioned safely (avoid going off-screen)
        const tooltip = tooltipRef.current;
        if (tooltip) {
            const point = filteredData[idx];
            const date = new Date(point.Date);
            tooltip.style.display = 'block';

            // prefer to position tooltip near cursor but keep inside viewport
            const tooltipPadding = 12;
            const left = Math.min(window.innerWidth - tooltip.offsetWidth - tooltipPadding, e.clientX + 16);
            const top = Math.max(tooltipPadding, e.clientY - tooltip.offsetHeight / 2);
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;

            tooltip.innerHTML = `
                <div class="tooltip-date">${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div class="tooltip-price">NEPSE: ${(+point.Close).toFixed(2)}</div>`;
        }

        // redraw chart with overlay at hover index
        drawChart(idx);
    };

    const onMouseLeave = () => {
        hoverIndexRef.current = null;
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        drawChart(null);
    };

    const attachListeners = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // avoid duplicate listeners
        detachListeners();
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
    };

    const detachListeners = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseleave', onMouseLeave);
    };

    // derive latest price values for header
    const latestData = data.length > 0 ? data[data.length - 1] : null;
    const currentPrice = latestData ? +latestData.Close : 0;
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
                            onClick={() => {
                                setTimeRange(range);
                                // immediately redraw chart for new range
                                setTimeout(() => drawChart(null), 0);
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container">
                {/* Keep canvas internal pixel size fixed for consistent coordinates.
                    If you want responsive drawing, you can dynamically set
                    canvas.width = canvas.clientWidth * devicePixelRatio and redraw.
                */}
                <canvas ref={canvasRef} width={1000} height={400} className="price-chart" />
            </div>

            <div ref={tooltipRef} className="tooltip"></div>
        </div>
    );
};

export default Nepse;
