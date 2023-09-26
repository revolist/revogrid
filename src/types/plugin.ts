export interface PluginBaseComponent {
    destroy(): void;
}
export interface PluginConstructor {
    new (revogrid: HTMLRevoGridElement, ...[]: Iterable<any>): PluginBaseComponent;
}

export interface PluginExternalConstructor {
    new (revogrid: HTMLRevoGridElement, providers: Record<string, any>, ...[]: Iterable<any>): PluginBaseComponent;
}
