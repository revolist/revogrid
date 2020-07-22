import {Module} from "./module.interfaces";

class ModuleRegister {
    private modules: {[key: string]: Module} = {};
    constructor() {}

    public register(name: string, module: Module): void {
        this.modules[name] = module;
    }

    public destroy(): void {
        for(let k in this.modules) {
            this.modules[k].destroy();
            delete this.modules[k];
        }
    }
}

const moduleRegister: ModuleRegister = new ModuleRegister();
export default moduleRegister;