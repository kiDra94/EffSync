const IS_MOCK = import.meta.env.VITE_DEV_MODE === 'true';

export const normalizeEntity = (entity, id_key) => {
    if (!entity) return null;
        return {
            ...entity,
            [id_key]: entity[id_key] ?? entity.id,
        };
};

export const normalizeEntities = (entities, idKey) => {
    if (!Array.isArray(entities)) return [];
    return entities.map((item) => normalizeEntity(item, idKey)); 
};

export const serializeEntity = (entity, id_key) => {
    if (!entity) return null;
    const { [id_key]: specific_id, id, ...rest } = entity;

    if(IS_MOCK){
        const serialized = {...rest};
        if(specific_id !== undefined) serialized.id = String(specific_id);
        else if (id !== undefined) serialized.id = String(id);
        return serialized;
    }

    return rest;
};