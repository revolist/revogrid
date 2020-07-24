import {Module} from "./module.interfaces";

class ModuleRegister {
    private modules: {[key: string]: Module} = {};
    private componentBaseClass: string = '';
    constructor() {}

    get baseClass(): string {
        return this.componentBaseClass;
    }

    set baseClass(c: string) {
        this.componentBaseClass = c;
    }

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