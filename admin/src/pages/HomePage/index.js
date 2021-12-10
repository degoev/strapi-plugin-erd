import React, { memo, useEffect, useState } from "react";
import { request } from "@strapi/helper-plugin";
import pluginId from "../../pluginId";
import * as SRD from "storm-react-diagrams";
import dagre from "dagre";
require("storm-react-diagrams/dist/style.min.css");
require("./main.css");

function autoLayout(engine, model) {
  const options = {
    graph: {
      rankdir: "RL",
      ranker: "longest-path",
      marginx: 25,
      marginy: 25,
    },
    includeLinks: true,
  };
  // Create a new directed graph
  var g = new dagre.graphlib.Graph({
    multigraph: true,
  });
  g.setGraph(options.graph);
  g.setDefaultEdgeLabel(function () {
    return {};
  });

  const processedlinks = {};

  // set nodes
  _.forEach(model.getNodes(), (node) => {
    g.setNode(node.getID(), { width: node.width, height: node.height });
  });

  _.forEach(model.getLinks(), (link) => {
    // set edges
    if (link.getSourcePort() && link.getTargetPort()) {
      processedlinks[link.getID()] = true;
      g.setEdge({
        v: link.getSourcePort().getNode().getID(),
        w: link.getTargetPort().getNode().getID(),
        name: link.getID(),
      });
    }
  });

  // layout the graph
  dagre.layout(g);
  g.nodes().forEach((v) => {
    const node = g.node(v);
    model
      .getNode(v)
      .setPosition(node.x - node.width / 2, node.y - node.height / 2);
  });
  engine.repaintCanvas();
}
const defaultAttributes = [
  `createdAt`,
  `createdBy`,
  `updatedAt`,
  `updatedBy`,
  `publishedAt`,
];

const excludeModels = [
  `role`,
  `user`,
  `permission`,
  `plugin::users-permissions.role`,
  `plugin::users-permissions.user`,
  `plugin::users-permissions.permission`,
  `plugin::upload.file`,
  `plugin::i18n.locale`,
];
function drawNodes(data) {
  const engine = new SRD.DiagramEngine();
  engine.installDefaultFactories();
  const model = new SRD.DiagramModel();

  const nodes = [],
    nodesMap = {},
    links = [];

  data = data.filter(
    (model) =>
      !model.key.startsWith(`admin::`) && !excludeModels.includes(model.key)
  );

  data.forEach((model, index) => {
    const node = new SRD.DefaultNodeModel(model.name, "rgb(0,126,255)");

    const ports = {
      id: node.addInPort("id"),
    };
    const tableColumns = Object.keys(model.attributes).filter(
      (attr) => !defaultAttributes.includes(attr)
    );

    tableColumns.forEach((attr) => {
      ports[attr] = {};
      const fieldData = model.attributes[attr];
      const relation = fieldData.target;
      const relationField = fieldData.inversedBy || fieldData.mappedBy;

      const outPort = nodesMap[relation]?.ports[relationField];

      if (relation && outPort) {
        const inPort = node.addInPort(attr);
        const link = inPort.link(outPort);

        links.push(link);
      } else {
        ports[attr] = node.addOutPort(attr);
      }

      if (relation && !relationField) {
        const inPort = nodesMap[relation]?.ports.id;
        if (inPort) {
          const link = inPort.link(ports[attr]);
          links.push(link);
        }
      }
    });
    node.setPosition(200 * index, 200);
    nodes.push(node);
    nodesMap[model.key] = { node, ports };
  });

  model.addAll(...nodes, ...links);

  engine.setDiagramModel(model);

  return { engine, model };
}

async function getERData() {
  return await request("/erd/erd-data");
}

const HomePage = () => {
  const [engine, setEngine] = useState();
  const [error, setError] = useState();
  useEffect(() => {
    async function getData() {
      try {
        const res = await getERData();
        const { engine, model } = drawNodes(res.data);
        setEngine(engine);
        autoLayout(engine, model);
      } catch (e) {
        setError(e);
      }
    }
    getData();
  }, []);

  return (
    <div style={{ padding: "25px 30px" }}>
      <div className="erc-header-title">
        <h1>Entity Relationship Chart</h1>
        <p>
          Displays Entity Relationship Diagram of all Strapi models, fields and
          relations.
        </p>
      </div>

      {error && (
        <div>
          <br />
          <h2>{error.toString()}</h2>
          <textarea
            rows={10}
            cols={200}
            disabled="disabled"
            style={{ fontSize: 10, fontFamily: "Courier" }}
          >
            {error.stack}
          </textarea>
        </div>
      )}
      {engine && (
        <SRD.DiagramWidget
          //   allowLooseLinks={false}
          //   allowCanvasTranslation={true}
          //   allowCanvasZoom={true}
          //   maxNumberPointsPerLink={0}
          //   smartRouting={false}
          diagramEngine={engine}
        />
      )}
    </div>
  );
};

export default memo(HomePage);
