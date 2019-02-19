import {InsightError} from "./IInsightFacade";
// import "./QueryInfo";
import {QueryInfo} from "./QueryInfo";
export default class QueryValidator  {
    public queryinfo: QueryInfo;
    public validatequery(query: any) {
        this.queryinfo = new QueryInfo(query);
        let keys: string[];
        keys = Object.keys(query);
        if (keys.length >= 4) {
            throw new InsightError("Excess keys in query");
        } else {
            if (!query.hasOwnProperty("WHERE")) {
                throw new InsightError("Missing Where");
                // There must be property of "WHERE", but for a small dataset < 5000 rows, it may be empty
            } else if (!query.hasOwnProperty("OPTIONS")) {
                throw new InsightError("Missing Options");
            } else if (!(query["OPTIONS"].hasOwnProperty("COLUMNS"))) {
                throw new InsightError("Options Missing Columns");
            } else if (query["OPTIONS"]["COLUMNS"].length <= 0) {
                throw new InsightError("Columns must be an un-empty array");
            } else if (keys.length === 3 && !query.hasOwnProperty("TRANSFORMATIONS")) {
                throw new InsightError("Missing Transformation, has some wrong key");
            } else if (query.hasOwnProperty("TRANSFORMATIONS")) {
                this.queryinfo.hasTransformation = true;
                this.validateWhere(query["WHERE"]);
                this.validateOptions(query["OPTIONS"]);
                return;
            } else {
                this.queryinfo.hasTransformation = false;
                this.validateWhere(query["WHERE"]);
                this.validateOptions(query["OPTIONS"]);
                return;
            }
        }
    }
    public validateWhere(wherepart: any) {
        if (typeof wherepart !== "object") { throw new InsightError("Where must be an object");
        // } else if (wherepart.length === 0) {
            // throw new InsightError("Where must be non-empty");
        } else if (Object.keys(wherepart).length > 1) {
            throw new InsightError("Excess keys in where");
        } else {
            return;
        }
    }
    public validateOptions(optionpart: any) {
        let self = this;
        if (typeof optionpart !== "object") {
            throw new InsightError("Options must be an object");
        } else {
            let keys = Object.keys(optionpart);
            if (!optionpart.hasOwnProperty("COLUMNS")) {
                throw new InsightError("Missing Columns");
            } else if (!Array.isArray(optionpart["COLUMNS"])) {
                throw new InsightError("Invalid query string 0");
            } else if (optionpart["COLUMNS"].length === 0) {
                throw new InsightError("COLUMNS must be non-empty");
            }
            if ((keys.length === 2 && !optionpart.hasOwnProperty("ORDER")) || keys.length >= 3) {
                throw new InsightError("Invalid keys in OPTIONS");
            }
            if (optionpart.hasOwnProperty("ORDER")) {
                if (typeof optionpart["ORDER"] !== "object" && typeof optionpart["ORDER"] !== "string") {
                    throw new InsightError("Invalid ORDER type");
                }
            }
            optionpart["COLUMNS"].forEach((element: any) => {
                if (typeof element !== "string") {
                    throw new InsightError("Invalid query string 1");
                }
            });
            if (self.queryinfo.hasTransformation) {
                self.queryinfo.checkcolumnsWithTrans();
            } else {
                self.queryinfo.checkcolumnsWithoutTrans();
            }
            if (optionpart.hasOwnProperty("ORDER")) {
                self.checkorder(this.queryinfo.columnsToDisp, optionpart["ORDER"]);
            }
            return;
        }
    }
    public checkorder(columns: Set<string>, order: any) {
        if (typeof order === "string") {
            let flag = false;
            columns.forEach((element) => {
                if (element === order) {
                    flag = true;
                }
            });
            if (!flag) {
                throw new InsightError("ORDER key must be in COLUMNS");
            }
        } else {
            this.checkOrderObj(columns, order);
        }
        this.queryinfo.order = order;
    }
    public checkOrderObj(columns: Set<string>, order: any) {
        let l = Object.keys(order).length;
        if (l !== 2) {
            throw new InsightError("ORDER key should have two dir and keys, have " + l);
        } else if (!order.hasOwnProperty("dir")) {
            throw new InsightError("invalid order key, missing dir");
        } else if (!order.hasOwnProperty("keys")) {
            throw new InsightError("invalid order key, missing keys");
        }
        if (order["dir"] !== "UP" && order["dir"] !== "DOWN") {
            throw new InsightError("invalid order direction");
        }
        if (!Array.isArray(order["keys"])) {
            throw new InsightError("invalid order, keys should be an array");
        } else if (order["keys"].length === 0) {
            throw new InsightError("invalid order, keys should be an non-empty array");
        } else {
            order["keys"].foreach((orderKey: any) => {
                let flag = false;
                columns.forEach((element) => {
                    if (element === orderKey) {
                        flag = true;
                    }
                });
                if (!flag) {
                    throw new InsightError("ORDER key must be in COLUMNS");
                }
            });
        }
    }
}
