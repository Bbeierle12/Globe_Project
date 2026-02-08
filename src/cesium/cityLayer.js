import * as Cesium from "cesium";

function minPopulationForCameraHeight(height) {
  if (height > 18000000) return 5000000;
  if (height > 5000000) return 500000;
  return 100000;
}

async function createCityLayer(viewer) {
  var response = await fetch("/data/cities.geojson");
  if (!response.ok) throw new Error("Failed to load cities: HTTP " + response.status);
  var geo = await response.json();
  if (!geo || !geo.features) throw new Error("Invalid cities GeoJSON: missing features array");

  var dataSource = new Cesium.CustomDataSource("cities");
  dataSource.clustering.enabled = true;
  dataSource.clustering.pixelRange = 28;
  dataSource.clustering.minimumClusterSize = 4;
  viewer.dataSources.add(dataSource);

  var entities = [];

  (geo.features || []).forEach(function(feature) {
    if (!feature.geometry || feature.geometry.type !== "Point") return;
    var coords = feature.geometry.coordinates || [];
    if (coords.length < 2) return;

    var props = feature.properties || {};
    var pop = Number(props.pop_max || props.population || 0);
    if (!Number.isFinite(pop) || pop < 100000) return;

    var cityEntry = {
      t: "city",
      n: props.name || props.nameascii || "Unknown City",
      p: Math.round(pop),
      la: Number(coords[1]),
      lo: Number(coords[0]),
      rg: props.adm0name || props.sov0name || null,
      cp: props.adm1name || null,
    };

    var entity = dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(cityEntry.lo, cityEntry.la, 0),
      point: {
        pixelSize: pop >= 5000000 ? 7 : pop >= 500000 ? 5 : 4,
        color: Cesium.Color.fromCssColorString("#cbe4ff").withAlpha(0.92),
        outlineColor: Cesium.Color.fromCssColorString("#1b3d60").withAlpha(0.95),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(50000, 1.4, 12000000, 0.22),
        disableDepthTestDistance: 15000000,
      },
      label: {
        text: cityEntry.n,
        font: "600 12px 'Segoe UI', sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#e6f1ff"),
        outlineColor: Cesium.Color.fromCssColorString("#0b1828"),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: 15000000,
        scaleByDistance: new Cesium.NearFarScalar(100000, 1.0, 9000000, 0.35),
      },
    });

    entity.__entry = cityEntry;
    entity.__cityPop = pop;
    entities.push(entity);
  });

  function refreshVisibility() {
    var cameraHeight = viewer.camera.positionCartographic.height;
    var minPop = minPopulationForCameraHeight(cameraHeight);
    entities.forEach(function(entity) {
      var visible = (entity.__cityPop || 0) >= minPop;
      entity.show = visible;
    });
  }

  refreshVisibility();
  viewer.camera.changed.addEventListener(refreshVisibility);

  function destroy() {
    viewer.camera.changed.removeEventListener(refreshVisibility);
    viewer.dataSources.remove(dataSource, true);
  }

  return {
    destroy: destroy,
    refreshVisibility: refreshVisibility,
    dataSource: dataSource,
  };
}

export { createCityLayer };
