function cloneCaseProjectDataBindings(caseDoc = {}, options = {}) {
    const now = typeof options.now === 'function' ? options.now() : new Date().toISOString();
    const bindings = Array.isArray(caseDoc.projectDataBindings) ? caseDoc.projectDataBindings : [];

    return bindings.map(binding => ({
        id: binding.id,
        dataId: binding.dataId || binding.id,
        name: binding.name || binding.id,
        sourcePath: binding.sourcePath || binding.mountPath || '',
        mountPath: binding.mountPath,
        mode: binding.mode || 'readonly',
        bindingType: binding.bindingType || 'bundled-case-data',
        status: binding.status || 'ready',
        addedAt: binding.addedAt || now,
        metadata: binding.metadata || {},
        source: binding.source || 'case',
        downloadable: Boolean(binding.downloadable),
        url: binding.url || '',
        materialized: binding.materialized !== false,
        localPath: binding.localPath || binding.mountPath || '',
        materializedAt: binding.materializedAt || now,
        error: binding.error || ''
    }));
}

function createCaseProjectMeta(username, projectName, caseDoc = {}, options = {}) {
    const now = typeof options.now === 'function' ? options.now() : new Date().toISOString();

    return {
        name: projectName,
        description: caseDoc.summary || caseDoc.description || '',
        isPublic: false,
        isCase: false,
        createdAt: now,
        createdBy: username,
        runtimeImageId: caseDoc.runtimeImageId || 'opengms-geoviz',
        dataBindings: cloneCaseProjectDataBindings(caseDoc, { now: () => now }),
        sourceCase: {
            slug: caseDoc.slug,
            title: caseDoc.title,
            source: caseDoc.source,
            sourceId: caseDoc.sourceId
        }
    };
}

module.exports = {
    cloneCaseProjectDataBindings,
    createCaseProjectMeta
};
