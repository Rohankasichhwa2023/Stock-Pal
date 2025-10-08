import React, { useEffect, useState } from "react";
import axios from "axios";

const NepseData = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        axios.get("http://127.0.0.1:8000/api/nepse/")
            .then(res => setData(res.data.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>NEPSE Data</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th><th>Open</th><th>High</th><th>Low</th>
                        <th>Close</th><th>Volume (M)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td>{new Date(row.Date).toLocaleDateString()}</td>
                            <td>{row.Open}</td>
                            <td>{row.High}</td>
                            <td>{row.Low}</td>
                            <td>{row.Close}</td>
                            <td>{row["Volume (in millions)"]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default NepseData;
