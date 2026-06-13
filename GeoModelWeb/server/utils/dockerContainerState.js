async function dockerContainerExists(containerName, runDockerCommand) {
    if (!containerName || typeof runDockerCommand !== 'function') return false;

    try {
        const result = await runDockerCommand(`docker inspect --format "{{.Name}}" ${containerName}`);
        return result
            .split(/\r?\n/)
            .map(name => name.trim())
            .includes(`/${containerName}`);
    } catch (error) {
        return false;
    }
}

async function isDockerContainerRunning(containerName, runDockerCommand) {
    if (!containerName || typeof runDockerCommand !== 'function') return false;

    try {
        const result = await runDockerCommand(`docker inspect --format "{{.State.Running}}" ${containerName}`);
        return String(result).trim().toLowerCase() === 'true';
    } catch (error) {
        return false;
    }
}

async function removeDockerContainer(containerName, runDockerCommand, options = {}) {
    const force = options.force ? '-f ' : '';
    await runDockerCommand(`docker rm ${force}${containerName}`);
}

module.exports = {
    dockerContainerExists,
    isDockerContainerRunning,
    removeDockerContainer
};
