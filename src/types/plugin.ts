/**
 * Interface for plugin components
 */
export interface PluginBaseComponent {
    /**
     * Cleans up plugin's resources
     */
    destroy?(): void;
}
