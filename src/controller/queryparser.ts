import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import InsightFacade, { IHash } from "./InsightFacade";
export default class Queryparser {
    private AST: IFilter = { FilterKey : "", value : [], nodes : []};
    private rowsbeforeoption: any[] = [];
    private allrows: any[] = [];
    private currentdatabasename: string = undefined;
    public columnstoshow = new Set<string>();
    public order: string = undefined;
    private renum = new RegExp(/[^_]+_(avg|pass|fail|audit|year)$/g);
    private res = new RegExp(/[^_]+_(dept|id|instructor|title|uuid)$/g);
    public excutequery(query: any, addHash: IHash, databasename: string): any[] {
        this.currentdatabasename = databasename;
        if (Object.keys(query["WHERE"]).length >= 2) { throw new InsightError("More than one key"); }
        this.AST = this.traverseFilterGenAst(query["WHERE"], null);
        if ( this.currentdatabasename !== databasename) {
            throw new InsightError("Cannot query more than one dataset 2");
        }
        this.astApplyToRow(this.currentdatabasename, addHash);
        this.applyOptions();
        return this.rowsbeforeoption;
    }
    public traverseFilterGenAst(filter: any, AST: IFilter): IFilter {
        let element = Object.keys(filter)[0];
        AST = { FilterKey : "", value : [] , nodes : []};
        AST.FilterKey = element;
        switch (element) {
            case "AND": case "OR":
                AST.nodes = this.logicSymbolTraverse(filter[element], AST, element);
                break;
            case "LT": case "GT": case "EQ": case "IS":
                AST = this.MSSymbolTraverse(filter[element], AST, element);
                break;
            case "NOT":
                AST = this.NegationTraverse(filter[element], AST);
                break;
            default:
                throw new InsightError("Invalid query string 2"); }
        return AST;
    }
    public logicSymbolTraverse(filtervalue: any, ast: IFilter, element: string): IFilter[] {
        if (!Array.isArray(filtervalue) /* || filtervalue.length === 0 */) {
            throw new InsightError(element + " must be a non-empty array.");
        }
        for (let eachfilter of filtervalue) {
            if (typeof eachfilter !== "object") {
                throw new InsightError(element + " must be object.");
            } // ast.FilterKey.value = eachfilter;
            let newnode: IFilter = { FilterKey : "", value : [] , nodes : []};
            ast.nodes.push(newnode);
            ast.nodes[ast.nodes.length - 1] = this.traverseFilterGenAst(eachfilter, ast.nodes[ast.nodes.length - 1]);
        }
        return ast.nodes;
    }
    public MSSymbolTraverse(filtervalue: any, ast: IFilter, element: string): IFilter {
        if (typeof filtervalue !== "object" || Array.isArray(filtervalue)) {
            throw new InsightError(element + " must be an object.");
        } else if (Object.keys(filtervalue).length !== 1) {
            throw new InsightError(element + " should only have 1 key, has " + Object.keys(filtervalue).length + " .");
        } else {
            this.keyMatchCheck(Object.keys(filtervalue)[0], element);
            let s: string[] = Object.keys(filtervalue)[0].split("_");
            if (this.currentdatabasename !== s[0]) {
                throw new InsightError("Cannot query more than one dataset 3");
            } else {
                ast = { FilterKey : "", value : [], nodes : []}; // ast.nodes.length = 0;
                if (element === "LT" || element === "GT" || element === "EQ") {
                    ast.FilterKey = element;
                    if (typeof filtervalue[Object.keys(filtervalue)[0]] !== "number") {
                        throw new InsightError("Invalid value type in " + element + " , should be number");
                    } else {
                        ast.value = [s[0], s[1], filtervalue[Object.keys(filtervalue)[0]]];
                    }
                } else {
                    ast.FilterKey = "IS";
                    if (typeof filtervalue[Object.keys(filtervalue)[0]] !== "string") {
                        throw new InsightError("Invalid value type in IS , should be string");
                    } else {
                        ast.value = [s[0], s[1], filtervalue[Object.keys(filtervalue)[0]]];
                    }
                }
                return ast;
            }
        }
    }
    public NegationTraverse(filtervalue: any, ast: IFilter): IFilter {
        if (typeof filtervalue !== "object" || Array.isArray(filtervalue)) {
            throw new InsightError("Invalid query string 3");
        } else if (Object.keys(filtervalue).length !== 1) {
            throw new InsightError("NOT should only have 1 key, has " + Object.keys(filtervalue).length + " .");
        } else {
            ast = { FilterKey : "", value : [], nodes : []};
            ast.FilterKey = "NOT";
            let newnode: IFilter = { FilterKey : "", value : [] , nodes : []};
            ast.nodes.push(newnode);
            ast.nodes[0] = this.traverseFilterGenAst(filtervalue, ast.nodes[0]);
        }
        return ast;
    }
    public keyMatchCheck(key: string, element: string) {
        let s = null;
        if (element === "IS") {
            s = key.match(this.res);
        } else if (element === "LT" || element === "GT" || element === "EQ") {
            s = key.match(this.renum);
        }
        if (s === null) { throw new InsightError("no _"); }
        if (s.length !== 1) {
            throw new InsightError("key doesn't match");
        } else if (s[0] !== key) {
            throw new InsightError("key doesn't match");
        } else {
            return;
        }
    }
    public astApplyToRow(currentdatabasename: string, addHash: IHash) {
        if (!addHash[currentdatabasename]) {
            throw new InsightError("Referenced dataset " + currentdatabasename + " not added yet");
        }
        this.rowsbeforeoption = this.traverseAst(this.AST, currentdatabasename, addHash);
    }
    public traverseAst(ast: IFilter, databasename: string, addHash: IHash): any[] {
        let self = this;
        this.allrows = addHash[databasename];
        function traverseArray(nodes: IFilter[], identifier: string): any[] {
            let midresult: any[] = [];
            if (identifier === "AND") {
                nodes.forEach((child) => {
                    midresult = self.keepcommon(midresult, traverseNode(child));
                });
            } else if (identifier === "OR") {
                nodes.forEach((child) => {
                    midresult = self.keepboth(midresult, traverseNode(child));
                });
            } else if (identifier === "NOT") {
                nodes.forEach((child) => {
                    midresult = self.reverse(traverseNode(child));
                });
            }
            return midresult;
        }
        function traverseNode(current: IFilter): any[] {
            let midresult: any[] = [];
            if (current === undefined) {throw new InsightError("undefined node?!"); }
            let identifier = current.FilterKey;
            if (identifier === "AND" || identifier === "OR" || identifier === "NOT") {
                midresult = traverseArray(current.nodes, identifier);
            } else if (identifier === "EQ" || identifier === "GT" || identifier === "LT" || identifier === "IS") {
                let value = current.value;
                switch (identifier) {
                    case "EQ":
                        midresult = self.selectrowM(value[1], value[2], "EQ");
                        break;
                    case "GT":
                        midresult = self.selectrowM(value[1], value[2], "GT");
                        break;
                    case "LT":
                        midresult = self.selectrowM(value[1], value[2], "LT");
                        break;
                    case "IS":
                        midresult = self.selectrowS(value[1], value[2]);
                        break;
                }
            }
            return midresult;
        }
        let result = traverseNode(ast);
        return result;
    }
    public keepcommon(array1: any[], array2: any[]): any[] {
        if (array1 === null ) {
            return array2;
        } else if (array2 === null ) {
            return array1;
        } else {
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
    }
    public keepboth(array1: any[], array2: any[]) {
        if (array1 === null) {
            return array2;
        } else if (array2 === null) {
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
        if (array1 === null) {
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
            default: break; }
        return ret;
    }
    public selectrowS(key: string, value: string): any[] {
        let ret: any[] = [];
        this.allrows.forEach((element) => {
            let regexp = new RegExp(/^[*]?[^*]*[*]?$/g);
            let s = value.match(regexp); if (s === null) { throw new InsightError("IS no match"); }
            if (s.length !== 1) {
                throw new InsightError("key doesn't match");
            } else if (s[0] !== value) {
                throw new InsightError("key doesn't match");
            } else {
                let s2 = element[key].match(regexp); if (s2 === null) { throw new InsightError("IS no match"); }
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
                if (!this.columnstoshow.has(keytoexamine)) {
                    delete element.keytoexamine;
                }
            });
        });
        this.sortrows();
    }
    public sortrows() {
        let self = this;
        if (self.order !== undefined) {
            this.rowsbeforeoption.sort(function (a, b) {
                let A = a[self.order];
                let B = b[self.order];
                if (A < B) {return -1; }
                if (A > B) {return 1; }
                return 0;
            });
        } else {return;
        }
    }
    public clean() {
        this.currentdatabasename = undefined;
        this.AST = undefined;
        this.rowsbeforeoption = undefined;
        this.columnstoshow.forEach((element) => {
            this.columnstoshow.delete(element);
        });
    }
}
