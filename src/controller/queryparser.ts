import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
export default class Queryparser {
    private ast: IFilter = undefined;
    private rowsbeforeoption: any[] = [];
    private data: InsightDataset[] = [];
    private allrows: any[];
    private static currentdatabasename: string = undefined;
    private static columnstoshow = new Set<string>();
    public traverseFilterGenAst(filter: any, ast: IFilter) {
        let element = Object.keys(filter)[0];
        switch (element) {
            case "AND":
            case "OR":
                this.logicSymbolTraverse(filter[element], ast, element);
                break;
            case "LT":
            case "GT":
            case "EQ":
            case "IS":
                this.MSSymbolTraverse(filter[element], ast, element);
                break;
            case "NOT":
                this.NegationTraverse(filter[element], ast);
                break;
            default:
                throw new InsightError("Invalid query string");
        }
    }
    public logicSymbolTraverse(filtervalue: any, ast: IFilter, element: string) {
        if (!Array.isArray(filtervalue) || filtervalue.length === 0) {
            throw new InsightError(element + " must be a non-empty array.");
        }
        ast.FilterKey.keytype = element; // ast.nodes.length = filter[element].length;
        for (let eachfilter of filtervalue) {
            if (typeof eachfilter !== "object") {
                throw new InsightError(element + " must be object.");
            }
            // ast.FilterKey.value = eachfilter;
            ast.nodes.push(eachfilter);
            this.traverseFilterGenAst(eachfilter, ast.nodes[ast.nodes.length - 1]);
        }
    }
    public MSSymbolTraverse(filtervalue: any, ast: IFilter, element: string) {
        if (typeof filtervalue !== "object" || Array.isArray(filtervalue)) {
            throw new InsightError(element + " must be an object.");
        } else if (Object.keys(filtervalue).length !== 1) {
            throw new InsightError(element + " should only have 1 key, has " + Object.keys(filtervalue).length + " .");
        } else {
            this.getStringToFrst_(Object.keys(filtervalue)[0], element);
            let s: string[] = Object.keys(filtervalue)[0].split("_");
            if (Queryparser.currentdatabasename === undefined) {
                Queryparser.currentdatabasename = s[0];
            } else if (Queryparser.currentdatabasename !== s[0]) {
                throw new InsightError("Cannot query more than one dataset");
            } else {
                ast.nodes.length = 0;
                if (element === "LT" || "GT" || "EQ") {
                    ast.FilterKey.keytype = element;
                    if (typeof filtervalue(Object.keys(filtervalue)[0]) !== "number") {
                        throw new InsightError("Invalid value type in " + element + " , should be number");
                    } else {
                        ast.FilterKey.value = [s[0], s[1], filtervalue(Object.keys(filtervalue)[0])];
                    }
                } else {
                    ast.FilterKey.keytype = "IS";
                    if (typeof filtervalue(Object.keys(filtervalue)[0]) !== "string") {
                        throw new InsightError("Invalid value type in IS , should be string");
                    } else {
                        ast.FilterKey.value = [s[0], s[1], filtervalue(Object.keys(filtervalue)[0])];
                    }
                }
            }
        }
    }
    public NegationTraverse(filtervalue: any, ast: IFilter) {
        if (typeof filtervalue !== "object" || Array.isArray(filtervalue)) {
            throw new InsightError("Invalid query string");
        } else if (Object.keys(filtervalue).length !== 1) {
            throw new InsightError("NOT should only have 1 key, has " + Object.keys(filtervalue).length + " .");
        } else {
            ast.FilterKey.keytype = "NOT";
            ast.nodes.length = 1;
            // ast.FilterKey.value = filtervalue;
            ast.nodes.push(filtervalue);
            this.traverseFilterGenAst(filtervalue, ast.nodes[0]);
        }
    }
    public getStringToFrst_(key: string, element: string) {
        let re;
        if (element === "LT" || "GT" || "EQ") {
            re = new RegExp(/[^_]+_(avg|pass|fail|audit|year)$/g);
        } else {
            re = new RegExp(/[^_]+_(dept|id|instructor|title|uuid)$/g);
        }
        let s = key.match(re);
        if (s.length !== 1) {
            throw new InsightError("key doesn't match");
        } else if (s[0] !== key) {
            throw new InsightError("key doesn't match");
        } else {
            return;
        }
    }
    public astApplyToRow(ast: IFilter, currentdatabasename: string) {
        if (!Object.keys(this.data).includes(currentdatabasename)) {
            throw new InsightError("Referenced dataset " + currentdatabasename + " not added yet");
        }
        // get all rows from the database corresponding to currentdatabasename
        this.rowsbeforeoption = this.traverseAst(this.ast, this.ast, currentdatabasename);
    }
    public traverseAst(ast: IFilter, visitor: IFilter, databasename: string): any[] {
        function traverseArray(nodes: IFilter[], parentnode: IFilter, identifier: string): any[] {
            let midresult: any[] = [];
            if (identifier === "AND") {
                nodes.forEach((child) => {
                    midresult = this.keepcommon(midresult, traverseNode(child, parentnode));
                });
            } else if (identifier === "OR") {
                nodes.forEach((child) => {
                    midresult = this.keepboth(midresult, traverseNode(child, parentnode));
                });
            } else if (identifier === "NOT") {
                nodes.forEach((child) => {
                    midresult = this.reverse(midresult);
                });
            }
            visitor = parentnode;
            return midresult;
        }
        function traverseNode(child: IFilter, parentnode: IFilter): any[] {
            let midresult: any[] = [];
            let identifier = visitor.FilterKey.keytype;
            if (identifier === "AND" || "OR" || "NOT") {
                midresult = traverseArray(child.nodes, child, identifier);
            } else if (identifier === "EQ" || "GT" || "LT" || "IS") {
                let value = child.FilterKey.value;
                let assert = require("assert");
                assert(value[0] === Queryparser.currentdatabasename);
                switch (identifier) {
                    case "EQ":
                        midresult = this.selectrowM(value[1], value[2], "EQ");
                        break;
                    case "GT":
                        midresult = this.selectrowM(value[1], value[2], "GT");
                        break;
                    case "LT":
                        midresult = this.selectrowM(value[1], value[2], "LT");
                        break;
                    case "IS":
                        midresult = this.selectrowS(value[1], value[2]);
                        break;
                }
            }
            return midresult;
        }
        let result = traverseNode(ast, null);
        return result;
    }
    public keepcommon(array1: any[], array2: any[]): any[] {
        if (array1.length !== 0 && array2.length !== 0) {
            let set = new Set();
            let ret: any[] = [];
            array1.forEach((element) => {
                set.add(element);
            });
            array2.forEach((element) => {
                if (!set.has(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
        return [];
    }
    public keepboth(array1: any[], array2: any[]) {
        if (array1.length === 0) {
            return array2;
        } else if (array2.length === 0) {
            return array1;
        } else {
            let ret = array1;
            array2.forEach((element) => {
                if (!ret.includes(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
    }
    public reverse(array1: any[]) {
        if (array1.length === 0) {
            return this.allrows;
        } else {
            let set = new Set();
            let ret: any[] = [];
            array1.forEach((element) => {
                set.add(element);
            });
            this.allrows.forEach((element) => {
                if (!set.has(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
    }
    public selectrowM(key: string, value: number, identifier: string): any[] {
        let ret: any[] = [];
        switch (identifier) {
            case "EQ":
            this.allrows.forEach((element) => {
                if (element.hasOwnProperty(key) && element.key === value) {
                    ret.push(element);
                }
            });
            break;
            case "GT":
            this.allrows.forEach((element) => {
                if (element.hasOwnProperty(key) && element.key > value) {
                    ret.push(element);
                }
            });
            break;
            case "LT":
            this.allrows.forEach((element) => {
                if (element.hasOwnProperty(key) && element.key < value) {
                    ret.push(element);
                }
            });
            break;
            default:
            break;
        }
        return ret;
    }
    public selectrowS(key: string, value: string): any[] {
        let ret: any[] = [];
        this.allrows.forEach((element) => {
            let regexp = new RegExp(/^[*]?[^*]*[*]?$/g);
            let s = value.match(regexp);
            if (s.length !== 1) {
                throw new InsightError("key doesn't match");
            } else if (s[0] !== value) {
                throw new InsightError("key doesn't match");
            } else {
                let s2 = element[key].match(regexp);
                if (s2.length === 1 && s2[0] === element[key]) {
                    ret.push(element);
                }
            }
        });
        return ret;
    }
    public applyOptions() {
        this.rowsbeforeoption.forEach((element) => {
            Object.keys(element).forEach((keytoexamine) => {
                if (!Queryparser.columnstoshow.has(keytoexamine)) {
                    delete element.keytoexamine;
                }
            });
        });
        Queryparser.currentdatabasename = undefined;
        this.ast = null;
        this.rowsbeforeoption = null;
        Queryparser.columnstoshow.forEach((element) => {
            Queryparser.columnstoshow.delete(element);
        });
    }
    public getresult(): any[] {
        return this.rowsbeforeoption;
    }
    public static getcolumnstoshow(): Set<string> {
        return Queryparser.columnstoshow;
    }
    public static columnstoshowpush(column: string) {
        Queryparser.columnstoshow.add(column);
    }
    public static getcurrentdataset(): string {
        return Queryparser.currentdatabasename;
    }
    public static setcurrentdataset(name: string) {
        Queryparser.currentdatabasename = name;
    }
}
