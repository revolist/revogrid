/**
 * Interface for plugin components
 */
export interface PluginBaseComponent {
    /**
     * Cleans up plugin's resources
     */
    destroy(): void;
}


/**
 * Interface for plugin constructors
 *
 * @param revogrid - The RevoGrid component instance
 * @param ...[] - Additional parameters for the plugin constructor
 *
 * @returns The created plugin component instance
 */
export interface PluginConstructor {
    new (revogrid: HTMLRevoGridElement, ...[]: Iterable<any>): PluginBaseComponent;
}

/**
 * Interface for plugin constructors that expect a providers object
 *
 * @param revogrid - The RevoGrid component instance
 * @param providers - The providers object to inject into the plugin's template
 * @param ...[] - Additional parameters for the plugin constructor
 *
 * @returns The created plugin component instance
 */
export interface PluginExternalConstructor {
    new (revogrid: HTMLRevoGridElement, providers: Record<string, any>, ...[]: Iterable<any>): PluginBaseComponent;
}
