import {Module} from "./module.interfaces";

class ModuleRegister {
    private modules: {[key: string]: Module} = {};
    constructor() {}

    register(name: string, module: Module): void {
        this.modules[name] = module;
    }

    unregister(name: string): void {
        this.modules[name]?.destroy();
        delete this.modules[name];
    }

    destroy(): void {
        for(let name in this.modules) {
            this.unregister(name);
        }
    }
}

const moduleRegister: ModuleRegister = new ModuleRegister();
export default moduleRegister;