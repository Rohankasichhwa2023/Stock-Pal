// Company.jsx
import "./Company.css";
import TradingView from "./component/TradingView"
import PriceHistory from "./component/PriceHistory";
import CompanyInfo from "./component/CompanyInfo";

export default function Company() {
    return (
        <>
            <CompanyInfo />
            <TradingView />
            <PriceHistory />
        </>
    )
}
