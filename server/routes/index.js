module.exports = [
  {
    method: "GET",
    path: "/erd-data",
    handler: "erdController.getErdData",
    config: {
      policies: [],
    },
  },
];
