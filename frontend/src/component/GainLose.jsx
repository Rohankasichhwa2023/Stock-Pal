import React, { useEffect, useState } from "react";
import axios from "axios";
import './GainLose.css';
import { useNavigate } from "react-router-dom";

export default function GainLose() {
    const [data, setData] = useState({ top_gainers: [], top_losers: [] });
    const navigate = useNavigate();

    useEffect(() => {
        axios.get("http://127.0.0.1:8000/api/company/top/")
            .then(res => setData(res.data))
            .catch(err => console.error(err));
    }, []);
    const handleGoToCompany = (symbol) => {
        navigate(`/company/${symbol}`);
    };
    return (
        <div className="gainlose-container">
            <h2>Top 5 Gainers</h2>
            <table className="gainlose-table gainers">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Change</th>
                        <th>% Change</th>
                        <th>Close</th>
                    </tr>
                </thead>
                <tbody>
                    {data.top_gainers.map((g, i) => (
                        <tr onClick={() => handleGoToCompany(g.symbol)} key={i}>

                            <td>{g.symbol}</td>
                            <td className="gainer">{g.change.toFixed(2)}</td>
                            <td className="gainer">{g.percent_change.toFixed(2)}%</td>
                            <td>{g.close}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2>Top 5 Losers</h2>
            <table className="gainlose-table losers">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Change</th>
                        <th>% Change</th>
                        <th>Close</th>
                    </tr>
                </thead>
                <tbody>
                    {data.top_losers.map((l, i) => (
                        <tr onClick={() => handleGoToCompany(l.symbol)} key={i}>
                            <td>{l.symbol}</td>
                            <td className="loser">{l.change.toFixed(2)}</td>
                            <td className="loser">{l.percent_change.toFixed(2)}%</td>
                            <td>{l.close}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
}
