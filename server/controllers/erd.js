"use strict";

const userPermissionModels = ["user", "role", "permission"];

module.exports = {
  getErdData: async (ctx) => {
    const { contentTypes: models } = strapi;
    const data = [];
    Object.keys(models).forEach((modelKey) => {
      const model = models[modelKey];
      data.push({
        name: model.info.singularName,
        attributes: model.attributes,
        key: modelKey,
      });
    });
    userPermissionModels.forEach((name) => {
      const model = models[`plugin::users-permissions.${name}`];
      data.push({
        name,
        attributes: model.attributes,
        key: name,
      });
    });
    ctx.send({
      data,
    });
  },
};
