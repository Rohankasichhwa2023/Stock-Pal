import "./Dashboard.css";
import Navbar from "./component/Navbar";
import Nepse from "./component/Nepse";
import GainLose from "./component/GainLose";

export default function Dashboard() {
    return (
        <>
            <Navbar />
            <div className="dashboard-content">
                <div className="left-panel">
                    <Nepse />
                </div>
                <div className="right-panel">
                    <GainLose />
                </div>
            </div>
        </>
    );
}
