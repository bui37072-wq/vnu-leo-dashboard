import { useEffect, useState } from 'react';
import './App.css';

import gateways from './data/gateways.json';
import satellites from './data/satellites.json';
import routers from './data/routers.json';
import handoverLogs from './data/handoverLogs.json';
import trafficHistory from './data/trafficHistory.json';

const menuItems = [
  { id: 'overview', label: 'Tổng quan', icon: '📊' },
  { id: 'architecture', label: 'Kiến trúc hệ thống', icon: '🏗️' },
  { id: 'orbit', label: 'Orbit Planning', icon: '🧮' },
  { id: 'gateway', label: 'Gateway', icon: '🌐' },
  { id: 'satellite', label: 'Vệ tinh', icon: '🛰️' },
  { id: 'router', label: 'Router người dùng', icon: '📡' },
  { id: 'router-simulation', label: 'Router Simulation', icon: '🖧' },
  { id: 'antenna', label: 'Antenna Tracking', icon: '🎯' },
  { id: 'traffic', label: 'Lưu lượng', icon: '📈' },
  { id: 'handover', label: 'Handover', icon: '🔁' },
  { id: 'alerts', label: 'Cảnh báo', icon: '⚠️' },
  { id: 'report', label: 'Báo cáo hệ thống', icon: '📝' }
];

function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [routerSearch, setRouterSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedRouterId, setSelectedRouterId] = useState('RT-101');
  const [selectedServiceType, setSelectedServiceType] = useState('Internet/VoIP');

  const [liveGateways, setLiveGateways] = useState(gateways);
  const [liveSatellites, setLiveSatellites] = useState(satellites);
  const [liveHandoverLogs, setLiveHandoverLogs] = useState(handoverLogs);
  const [simulationTime, setSimulationTime] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  function getGatewayByLatitude(latitude) {
    if (latitude >= 18) return { gateway: 'GW-HN', coverage: 'Miền Bắc' };
    if (latitude >= 13) return { gateway: 'GW-DN', coverage: 'Miền Trung' };
    return { gateway: 'GW-HCM', coverage: 'Miền Nam' };
  }

  function getAliveStatus(lastSeen) {
    if (lastSeen <= 10) return 'Alive';
    if (lastSeen <= 20) return 'Warning';
    return 'Dead';
  }

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  function checkGeoFence(router) {
    if (router.plan === 'Mobility') return 'Allowed';

    const distance = getDistanceKm(
      router.latitude,
      router.longitude,
      router.homeLatitude,
      router.homeLongitude
    );

    return distance <= router.allowedRadiusKm ? 'Allowed' : 'Violation';
  }

  function checkDeviceVerification(router) {
    return router.hardwareId === router.registeredHardwareId
      ? 'Verified'
      : 'Spoofing';
  }

  function calculateDistanceKm(router, satellite) {
    const horizontalDistance = getDistanceKm(
      router.latitude,
      router.longitude,
      satellite.latitude,
      satellite.longitude
    );

    const altitudeKm = satellite.altitude || 550;

    return Math.sqrt(
      horizontalDistance * horizontalDistance + altitudeKm * altitudeKm
    );
  }

  function calculatePathLoss(distanceKm, frequencyGhz = 12) {
    const frequencyMhz = frequencyGhz * 1000;
    return 32.44 + 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMhz);
  }

  function calculateAntennaMetrics(router, satellite) {
    const distanceKm = calculateDistanceKm(router, satellite);
    const pathLoss = calculatePathLoss(distanceKm);

    const azimuth = Math.round(
      ((satellite.longitude - router.longitude + 180) % 360) - 180
    );

    const elevation = Math.max(
      5,
      Math.min(
        90,
        Math.round(Math.atan2(satellite.altitude, distanceKm) * (180 / Math.PI))
      )
    );

    const pointingError = Math.abs(Math.sin(simulationTime / 4)) * 6;

    const rainLoss =
      router.location === 'TP.HCM' || router.location === 'Nha Trang'
        ? 2.5
        : 1.2;

    const atmosphericLoss = 1.5;
    const totalLoss = Number((pathLoss + rainLoss + atmosphericLoss).toFixed(2));

    const cn = Math.max(
      4,
      Math.min(
        22,
        24 -
          (pathLoss - 168) * 0.18 -
          pointingError * 0.5 -
          rainLoss +
          (satellite.signalQuality - 80) * 0.05
      )
    );

    const signalQuality = Math.max(
      0,
      Math.min(100, Math.round((cn / 22) * 100))
    );

    let linkStatus = 'Good';

    if (cn < 8) {
      linkStatus = 'Poor';
    } else if (cn < 12) {
      linkStatus = 'Warning';
    }

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      azimuth,
      elevation,
      pointingError: Number(pointingError.toFixed(2)),
      pathLoss: Number(pathLoss.toFixed(2)),
      rainLoss,
      atmosphericLoss,
      totalLoss,
      cn: Number(cn.toFixed(2)),
      signalQuality,
      linkStatus
    };
  }

  function calculateRouterSimulation(router, satellite, gateway, serviceType) {
    const antennaData = calculateAntennaMetrics(router, satellite);

    const baseLatency = serviceType === 'Internet/VoIP' ? 25 : 45;
    const trafficBase = serviceType === 'Internet/VoIP' ? 35 : 180;

    const latency = Math.max(
      15,
      Math.round(
        baseLatency +
          antennaData.distanceKm / 120 +
          Math.abs(Math.sin(simulationTime / 3)) * 12
      )
    );

    const traffic = Math.max(
      5,
      Math.round(
        trafficBase +
          Math.abs(Math.sin(simulationTime / 4)) * 60 -
          antennaData.pointingError * 2
      )
    );

    const packetLoss = Math.max(
      0,
      Number(
        (
          (antennaData.linkStatus === 'Good' ? 0.2 : 1.5) +
          antennaData.pointingError * 0.15 +
          Math.abs(Math.sin(simulationTime / 5)) * 0.8
        ).toFixed(2)
      )
    );

    let connectionStatus = 'Connected';

    if (antennaData.cn < 8 || packetLoss > 5) {
      connectionStatus = 'Poor';
    } else if (antennaData.cn < 12 || latency > 80) {
      connectionStatus = 'Warning';
    }

    const handoverStatus =
      satellite.gateway !== router.gateway ? 'Handover Required' : 'Stable';

    return {
      routerId: router.id,
      routerLocation: router.location,
      satelliteId: satellite.id,
      gatewayId: gateway?.id || satellite.gateway,
      serviceType,
      cn: antennaData.cn,
      latency,
      traffic,
      packetLoss,
      signalQuality: antennaData.signalQuality,
      connectionStatus,
      handoverStatus
    };
  }

  function calculateOrbitPlan() {
    const vietnamLengthKm = 1650;
    const vietnamWidthKm = 600;
    const leoAltitudeKm = 550;
    const earthRadiusKm = 6371;
    const minElevationDeg = 25;
    const minElevationRad = (minElevationDeg * Math.PI) / 180;

    const coverageRadiusKm = Math.round(
      Math.sqrt(
        Math.pow(earthRadiusKm + leoAltitudeKm, 2) -
          Math.pow(earthRadiusKm * Math.cos(minElevationRad), 2)
      ) -
        earthRadiusKm * Math.sin(minElevationRad)
    );

    const coverageDiameterKm = coverageRadiusKm * 2;
    const satellitesAlongLength = Math.ceil(vietnamLengthKm / coverageDiameterKm);
    const satellitesAcrossWidth = Math.ceil(vietnamWidthKm / coverageDiameterKm);

    const visibleSatellitesNeeded = Math.max(
      3,
      satellitesAlongLength * satellitesAcrossWidth
    );

    const redundancyFactor = 6;
    const totalSatellites = visibleSatellitesNeeded * redundancyFactor;
    const orbitalPlanes = 3;
    const satellitesPerPlane = Math.ceil(totalSatellites / orbitalPlanes);

    return {
      leoAltitudeKm,
      minElevationDeg,
      coverageRadiusKm,
      coverageDiameterKm,
      visibleSatellitesNeeded,
      redundancyFactor,
      totalSatellites,
      orbitalPlanes,
      satellitesPerPlane,
      inclinationDeg: 53
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isSimulationRunning) return;

      setSimulationTime((prevTime) => {
        const nextTime = prevTime + 1;

        setLiveSatellites((prevSatellites) => {
          const updatedSatellites = prevSatellites.map((sat, index) => {
            if (sat.status === 'Offline') return sat;

            const oldGateway = sat.gateway;
            const phase = index * 55;
            const angle = (nextTime * 10 + phase) % 360;

            const newLongitude = 102 + (angle / 360) * 8;
            const newLatitude = 15.5 + Math.sin((angle * Math.PI) / 180) * 6.5;
            const gatewayInfo = getGatewayByLatitude(newLatitude);

            const newSignalQuality = Math.max(
              55,
              Math.min(
                98,
                Math.round(80 + Math.sin((angle * Math.PI) / 180) * 18)
              )
            );

            const newStatus = newSignalQuality < 70 ? 'Warning' : 'Online';

            if (oldGateway !== gatewayInfo.gateway) {
              const now = new Date();
              const timeText = now.toLocaleTimeString('vi-VN', {
                hour12: false
              });

              setLiveHandoverLogs((prevLogs) => [
                {
                  time: timeText,
                  sessionId: `SES-${sat.id}-${nextTime}`,
                  serviceType:
                    newSignalQuality > 80
                      ? 'Internet/VoIP'
                      : 'Weather Radar Data',
                  sessionStatus: 'Maintained',
                  router: 'SYSTEM',
                  satellite: sat.id,
                  fromGateway: oldGateway,
                  toGateway: gatewayInfo.gateway,
                  reason: 'Vệ tinh di chuyển sang vùng phủ Gateway mới'
                },
                ...prevLogs
              ]);
            }

            return {
              ...sat,
              longitude: Number(newLongitude.toFixed(2)),
              latitude: Number(newLatitude.toFixed(2)),
              gateway: gatewayInfo.gateway,
              coverage: gatewayInfo.coverage,
              signalQuality: newSignalQuality,
              status: newStatus
            };
          });

          setLiveGateways((prevGateways) =>
            prevGateways.map((gw) => {
              const connectedSats = updatedSatellites.filter(
                (sat) => sat.gateway === gw.id && sat.status !== 'Offline'
              );

              const nearestSatellite =
                updatedSatellites
                  .filter((sat) => sat.status !== 'Offline')
                  .sort((a, b) => {
                    const distanceA = getDistanceKm(
                      gw.latitude,
                      gw.longitude,
                      a.latitude,
                      a.longitude
                    );

                    const distanceB = getDistanceKm(
                      gw.latitude,
                      gw.longitude,
                      b.latitude,
                      b.longitude
                    );

                    return distanceA - distanceB;
                  })[0] || null;

              const trafficChange = Math.round(Math.random() * 26 - 12);

              const newTraffic = Math.max(
                120,
                Math.min(gw.capacity, gw.traffic + trafficChange)
              );

              const selectedSatellite =
                connectedSats.length > 0 ? connectedSats[0] : nearestSatellite;

              let newStatus = 'Online';

              if (!selectedSatellite) {
                newStatus = 'Warning';
              }

              if (newTraffic > gw.capacity * 0.9) {
                newStatus = 'Warning';
              }

              const now = new Date();
              const timeText = now.toLocaleTimeString('vi-VN', {
                hour12: false
              });

              return {
                ...gw,
                traffic: newTraffic,
                status: newStatus,
                activeRouters: Math.max(
                  10,
                  Math.min(
                    80,
                    gw.activeRouters + Math.round(Math.random() * 6 - 3)
                  )
                ),
                connectedSatellite: selectedSatellite
                  ? selectedSatellite.id
                  : 'None',
                lastUpdate: timeText
              };
            })
          );

          return updatedSatellites;
        });

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulationRunning]);

  const totalTraffic = liveGateways.reduce((sum, gw) => sum + gw.traffic, 0);

  const onlineGateways = liveGateways.filter(
    (gw) => gw.status === 'Online'
  ).length;

  const onlineSatellites = liveSatellites.filter(
    (sat) => sat.status === 'Online'
  ).length;

  const activeRouters = routers.filter(
    (rt) => rt.status === 'Connected' && getAliveStatus(rt.lastSeen) === 'Alive'
  ).length;

  const alerts = [];

  liveGateways.forEach((gw) => {
    if (gw.status === 'Offline') {
      alerts.push(`${gw.id} đang mất kết nối`);
    }

    if (gw.traffic > 400) {
      alerts.push(`${gw.id} có lưu lượng cao: ${gw.traffic} Mbps`);
    }
  });

  routers.forEach((rt) => {
    const aliveStatus = getAliveStatus(rt.lastSeen);
    const geoFenceStatus = checkGeoFence(rt);
    const verificationStatus = checkDeviceVerification(rt);

    if (aliveStatus === 'Dead') alerts.push(`${rt.id} không phản hồi, trạng thái Dead`);
    if (rt.status === 'Disconnected') alerts.push(`${rt.id} đã mất kết nối`);
    if (rt.cn < 12) alerts.push(`${rt.id} có C/N thấp: ${rt.cn} dB`);
    if (rt.latency > 60) alerts.push(`${rt.id} có độ trễ cao: ${rt.latency} ms`);
    if (verificationStatus === 'Spoofing') alerts.push(`${rt.id} nghi ngờ giả mạo Hardware ID`);
    if (geoFenceStatus === 'Violation') alerts.push(`${rt.id} dùng gói Fixed nhưng đã rời khỏi vùng đăng ký`);
  });

  liveSatellites.forEach((sat) => {
    if (sat.status === 'Offline') alerts.push(`${sat.id} đang Offline`);
    if (sat.status === 'Warning') alerts.push(`${sat.id} có chất lượng tín hiệu thấp: ${sat.signalQuality}%`);
    if (sat.signalQuality < 70 && sat.status !== 'Offline') {
      alerts.push(`${sat.id} có signal quality thấp: ${sat.signalQuality}%`);
    }
  });

  const filteredRouters = routers.filter((rt) => {
    const matchSearch =
      rt.id.toLowerCase().includes(routerSearch.toLowerCase()) ||
      rt.user.toLowerCase().includes(routerSearch.toLowerCase()) ||
      rt.location.toLowerCase().includes(routerSearch.toLowerCase());

    const matchPlan = planFilter === 'All' || rt.plan === planFilter;

    return matchSearch && matchPlan;
  });

  const selectedRouter =
    routers.find((router) => router.id === selectedRouterId) || routers[0];

  const bestSatellite =
    liveSatellites
      .filter((sat) => sat.status !== 'Offline')
      .sort((a, b) => {
        const distanceA = calculateDistanceKm(selectedRouter, a);
        const distanceB = calculateDistanceKm(selectedRouter, b);
        return distanceA - distanceB;
      })[0] || liveSatellites[0];

  const antennaMetrics = calculateAntennaMetrics(selectedRouter, bestSatellite);
  const orbitPlan = calculateOrbitPlan();

  const selectedGateway =
    liveGateways.find((gw) => gw.id === bestSatellite.gateway) || liveGateways[0];

  const routerSimulation = calculateRouterSimulation(
    selectedRouter,
    bestSatellite,
    selectedGateway,
    selectedServiceType
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">🛰️</div>
          <div>
            <h2>VNU-LEO</h2>
            <p>Network Admin</p>
          </div>
        </div>

        <nav className="menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={activeMenu === item.id ? 'active' : ''}
              onClick={() => setActiveMenu(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>VNU-LEO Network Management Dashboard</h1>
            <p>Giám sát Gateway, vệ tinh, Router, lưu lượng và lịch sử handover</p>
          </div>

          <div className="status-group">
            <div className="system-status">
              <span className="dot"></span>
              System Online
            </div>

            <div className="sim-time">T+{simulationTime}s</div>

            <button
              className={`sim-control ${isSimulationRunning ? 'pause-btn' : 'resume-btn'}`}
              onClick={() => setIsSimulationRunning(!isSimulationRunning)}
            >
              {isSimulationRunning ? 'Pause' : 'Resume'}
            </button>
          </div>
        </header>

        {activeMenu === 'overview' && (
          <section className="page">
            <h2>Tổng quan hệ thống</h2>

            <div className="cards">
              <div className="card">
                <h3>Satellites Online</h3>
                <p>{onlineSatellites}/{liveSatellites.length}</p>
              </div>

              <div className="card">
                <h3>Gateways Online</h3>
                <p>{onlineGateways}/{liveGateways.length}</p>
              </div>

              <div className="card">
                <h3>Active Routers</h3>
                <p>{activeRouters}/{routers.length}</p>
              </div>

              <div className="card">
                <h3>Total Traffic</h3>
                <p>{totalTraffic} Mbps</p>
              </div>

              <div className="card">
                <h3>Handover Events</h3>
                <p>{liveHandoverLogs.length}</p>
              </div>
            </div>

            <div className="overview-grid">
              <div className="panel">
                <h3>Tình trạng hệ thống</h3>
                <p>
                  Hệ thống đang giám sát các Gateway mặt đất tại Hà Nội, Đà Nẵng
                  và TP.HCM.
                </p>
                <p>
                  Dashboard mô phỏng vệ tinh LEO di chuyển, cập nhật Gateway theo
                  vùng phủ và tự sinh lịch sử handover khi có chuyển giao.
                </p>
              </div>

              <div className="panel">
                <h3>Cảnh báo nhanh</h3>
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div className="alert" key={index}>{alert}</div>
                  ))
                ) : (
                  <p>Không có cảnh báo.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeMenu === 'architecture' && (
          <section className="page">
            <h2>Kiến trúc hệ thống VNU-LEO</h2>

            <div className="architecture-layout">
              <div className="architecture-card">
                <div className="arch-icon">📡</div>
                <h3>Router người dùng</h3>
                <p>Thiết bị đầu cuối kiểu Starlink, theo dõi C/N, suy hao và chất lượng tín hiệu.</p>
              </div>

              <div className="arch-arrow">↓</div>

              <div className="architecture-card">
                <div className="arch-icon">🛰️</div>
                <h3>Vệ tinh LEO</h3>
                <p>Mô phỏng vệ tinh di chuyển, thay đổi vùng phủ và kết nối Gateway phù hợp.</p>
              </div>

              <div className="arch-arrow">↓</div>

              <div className="architecture-card gateway-layer">
                <div className="arch-icon">🌐</div>
                <h3>Gateway mặt đất</h3>
                <p>Gồm GW-HN, GW-DN, GW-HCM. Duy trì phiên kết nối và ghi nhận handover.</p>
              </div>

              <div className="arch-arrow">↓</div>

              <div className="architecture-card dashboard-layer">
                <div className="arch-icon">🖥️</div>
                <h3>Web Admin Dashboard</h3>
                <p>Giám sát Alive/Dead, lưu lượng, Router, vệ tinh, cảnh báo và báo cáo hệ thống.</p>
              </div>
            </div>

            <div className="panel">
              <h3>Luồng dữ liệu trong hệ thống</h3>

              <table>
                <thead>
                  <tr>
                    <th>Thành phần</th>
                    <th>Dữ liệu cung cấp</th>
                    <th>Hiển thị trên Dashboard</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Router người dùng</td>
                    <td>C/N, vị trí, gói cước, traffic, latency</td>
                    <td>Router Management, Router Simulation, Antenna Tracking</td>
                  </tr>
                  <tr>
                    <td>Vệ tinh LEO</td>
                    <td>Latitude, Longitude, Signal Quality, Gateway</td>
                    <td>Satellite Map, Handover, Signal Status</td>
                  </tr>
                  <tr>
                    <td>Gateway</td>
                    <td>Trạng thái, lưu lượng, Router đang kết nối</td>
                    <td>Gateway Table, Traffic Monitoring</td>
                  </tr>
                  <tr>
                    <td>Dashboard</td>
                    <td>Tổng hợp dữ liệu từ toàn hệ thống</td>
                    <td>Báo cáo, cảnh báo, giám sát tập trung</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'orbit' && (
          <section className="page">
            <h2>Tính toán và đề xuất chòm vệ tinh LEO</h2>

            <div className="orbit-grid">
              <div className="panel">
                <h3>Thông số đầu vào</h3>

                <table>
                  <tbody>
                    <tr>
                      <td>Vùng cần phủ sóng</td>
                      <td>Toàn bộ Việt Nam</td>
                    </tr>
                    <tr>
                      <td>Chiều dài xấp xỉ</td>
                      <td>1650 km</td>
                    </tr>
                    <tr>
                      <td>Chiều rộng xấp xỉ</td>
                      <td>600 km</td>
                    </tr>
                    <tr>
                      <td>Độ cao quỹ đạo LEO</td>
                      <td>{orbitPlan.leoAltitudeKm} km</td>
                    </tr>
                    <tr>
                      <td>Góc ngẩng tối thiểu</td>
                      <td>{orbitPlan.minElevationDeg}°</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h3>Kết quả tính toán phủ sóng</h3>

                <table>
                  <tbody>
                    <tr>
                      <td>Bán kính phủ sóng ước lượng</td>
                      <td>{orbitPlan.coverageRadiusKm} km</td>
                    </tr>
                    <tr>
                      <td>Đường kính vùng phủ</td>
                      <td>{orbitPlan.coverageDiameterKm} km</td>
                    </tr>
                    <tr>
                      <td>Số vệ tinh cần nhìn thấy tức thời</td>
                      <td>{orbitPlan.visibleSatellitesNeeded}</td>
                    </tr>
                    <tr>
                      <td>Hệ số dự phòng do vệ tinh di chuyển</td>
                      <td>x{orbitPlan.redundancyFactor}</td>
                    </tr>
                    <tr>
                      <td>Tổng số vệ tinh đề xuất</td>
                      <td><strong>{orbitPlan.totalSatellites} vệ tinh</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <h3>Đề xuất sắp xếp quỹ đạo</h3>

              <div className="orbit-layout">
                <div className="orbit-card">
                  <h4>Số mặt phẳng quỹ đạo</h4>
                  <p>{orbitPlan.orbitalPlanes}</p>
                </div>

                <div className="orbit-card">
                  <h4>Vệ tinh mỗi mặt phẳng</h4>
                  <p>{orbitPlan.satellitesPerPlane}</p>
                </div>

                <div className="orbit-card">
                  <h4>Độ nghiêng quỹ đạo</h4>
                  <p>{orbitPlan.inclinationDeg}°</p>
                </div>

                <div className="orbit-card">
                  <h4>Độ cao</h4>
                  <p>{orbitPlan.leoAltitudeKm} km</p>
                </div>
              </div>

              <p className="orbit-note">
                Cấu hình đề xuất sử dụng nhiều mặt phẳng quỹ đạo để đảm bảo luôn
                có vệ tinh phủ sóng Việt Nam. Số vệ tinh thực tế cần có cao hơn
                số vệ tinh nhìn thấy tức thời vì vệ tinh LEO di chuyển nhanh và
                cần dự phòng cho handover.
              </p>
            </div>

            <div className="panel">
              <h3>Đáp ứng hai loại dịch vụ</h3>

              <table>
                <thead>
                  <tr>
                    <th>Dịch vụ</th>
                    <th>Yêu cầu chính</th>
                    <th>Chiến lược lựa chọn vệ tinh/Gateway</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Internet / VoIP</td>
                    <td>Độ trễ thấp, handover nhanh, kết nối ổn định</td>
                    <td>Ưu tiên vệ tinh gần Router nhất, Gateway có latency thấp</td>
                  </tr>

                  <tr>
                    <td>Ảnh / Radar thời tiết</td>
                    <td>Băng thông cao, C/N tốt, ít mất gói</td>
                    <td>Ưu tiên Gateway ít tải, C/N cao, signal quality tốt</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'gateway' && (
          <section className="page">
            <h2>Quản lý Gateway</h2>

            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Gateway</th>
                    <th>Tên</th>
                    <th>Vị trí</th>
                    <th>Tọa độ</th>
                    <th>Trạng thái</th>
                    <th>Lưu lượng</th>
                    <th>Router</th>
                    <th>Vệ tinh</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>

                <tbody>
                  {liveGateways.map((gw) => (
                    <tr key={gw.id}>
                      <td>{gw.id}</td>
                      <td>{gw.name}</td>
                      <td>{gw.location}</td>
                      <td>{gw.latitude}, {gw.longitude}</td>
                      <td>
                        <span className={`badge ${
                          gw.status === 'Online'
                            ? 'online'
                            : gw.status === 'Warning'
                              ? 'warning'
                              : 'offline'
                        }`}>
                          {gw.status}
                        </span>
                      </td>
                      <td>{gw.traffic}/{gw.capacity} Mbps</td>
                      <td>{gw.activeRouters}</td>
                      <td>{gw.connectedSatellite}</td>
                      <td>{gw.lastUpdate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'satellite' && (
          <section className="page">
            <h2>Quản lý và mô phỏng vệ tinh</h2>

            <div className="panel satellite-map">
              <h3>Bản đồ mô phỏng vị trí vệ tinh</h3>

              <div className="map-area">
                <div className="orbit-line orbit-1"></div>
                <div className="orbit-line orbit-2"></div>
                <div className="orbit-line orbit-3"></div>

                <div className="region north">Miền Bắc<br />GW-HN</div>
                <div className="region central">Miền Trung<br />GW-DN</div>
                <div className="region south">Miền Nam<br />GW-HCM</div>

                {liveSatellites
                  .filter((sat) => sat.status !== 'Offline')
                  .map((sat) => (
                    <div
                      className="sat-dot"
                      key={sat.id}
                      style={{
                        left: `${Math.max(5, Math.min(95, ((sat.longitude - 102) / 8) * 100))}%`,
                        top: `${Math.max(8, Math.min(92, ((23 - sat.latitude) / 15) * 100))}%`
                      }}
                      title={`${sat.id} - ${sat.coverage}`}
                    >
                      🛰️
                      <span>{sat.id}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="panel">
              <h3>Bảng trạng thái vệ tinh</h3>

              <table>
                <thead>
                  <tr>
                    <th>Satellite</th>
                    <th>Quỹ đạo</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Độ cao</th>
                    <th>Tốc độ</th>
                    <th>Vùng phủ</th>
                    <th>Gateway</th>
                    <th>Chất lượng tín hiệu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {liveSatellites.map((sat) => (
                    <tr key={sat.id}>
                      <td>{sat.id}</td>
                      <td>{sat.orbit}</td>
                      <td>{sat.latitude}</td>
                      <td>{sat.longitude}</td>
                      <td>{sat.altitude} km</td>
                      <td>{sat.speed} km/s</td>
                      <td>{sat.coverage}</td>
                      <td>{sat.gateway}</td>
                      <td>
                        <div className="progress">
                          <div
                            className={`progress-bar ${sat.signalQuality < 70 ? 'progress-warning' : ''}`}
                            style={{ width: `${sat.signalQuality}%` }}
                          ></div>
                        </div>
                        <span>{sat.signalQuality}%</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          sat.status === 'Online'
                            ? 'online'
                            : sat.status === 'Warning'
                              ? 'warning'
                              : 'offline'
                        }`}>
                          {sat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'router' && (
          <section className="page">
            <h2>Quản lý Router người dùng</h2>

            <div className="toolbar">
              <input
                type="text"
                placeholder="Tìm Router, người dùng hoặc vị trí..."
                value={routerSearch}
                onChange={(e) => setRouterSearch(e.target.value)}
              />

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="All">Tất cả gói cước</option>
                <option value="Fixed">Fixed</option>
                <option value="Mobility">Mobility</option>
              </select>
            </div>

            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Router</th>
                    <th>Người dùng</th>
                    <th>Vị trí</th>
                    <th>Gói cước</th>
                    <th>Alive/Dead</th>
                    <th>Device</th>
                    <th>Geo-fence</th>
                    <th>Gateway</th>
                    <th>Vệ tinh</th>
                    <th>C/N</th>
                    <th>Latency</th>
                    <th>Lưu lượng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRouters.map((rt) => {
                    const aliveStatus = getAliveStatus(rt.lastSeen);
                    const geoFenceStatus = checkGeoFence(rt);
                    const verificationStatus = checkDeviceVerification(rt);

                    return (
                      <tr key={rt.id}>
                        <td>{rt.id}</td>
                        <td>{rt.user}</td>
                        <td>{rt.location}</td>
                        <td>{rt.plan}</td>
                        <td>
                          <span className={`badge ${
                            aliveStatus === 'Alive'
                              ? 'online'
                              : aliveStatus === 'Warning'
                                ? 'warning'
                                : 'offline'
                          }`}>
                            {aliveStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            verificationStatus === 'Verified' ? 'online' : 'offline'
                          }`}>
                            {verificationStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            geoFenceStatus === 'Allowed' ? 'online' : 'offline'
                          }`}>
                            {geoFenceStatus}
                          </span>
                        </td>
                        <td>{rt.gateway}</td>
                        <td>{rt.satellite}</td>
                        <td>{rt.cn} dB</td>
                        <td>{rt.latency} ms</td>
                        <td>{rt.traffic} Mbps</td>
                        <td>
                          <span className={`badge ${
                            rt.status === 'Connected'
                              ? 'online'
                              : rt.status === 'Warning'
                                ? 'warning'
                                : 'offline'
                          }`}>
                            {rt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRouters.length === 0 && (
                <p className="empty">Không tìm thấy Router phù hợp.</p>
              )}
            </div>
          </section>
        )}

        {activeMenu === 'router-simulation' && (
          <section className="page">
            <h2>Mô phỏng hoạt động Router người dùng</h2>

            <div className="toolbar">
              <select
                value={selectedRouterId}
                onChange={(e) => setSelectedRouterId(e.target.value)}
              >
                {routers.map((router) => (
                  <option key={router.id} value={router.id}>
                    {router.id} - {router.location}
                  </option>
                ))}
              </select>

              <select
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value)}
              >
                <option value="Internet/VoIP">Internet / VoIP</option>
                <option value="Weather Radar Data">Ảnh / Radar thời tiết</option>
              </select>
            </div>

            <div className="router-simulation-layout">
              <div className="panel router-flow-panel">
                <h3>Luồng kết nối Router</h3>

                <div className="router-flow">
                  <div className="flow-node router-node">
                    <div className="flow-icon">📡</div>
                    <h4>{routerSimulation.routerId}</h4>
                    <p>{routerSimulation.routerLocation}</p>
                  </div>

                  <div className="flow-link"><span>Uplink</span></div>

                  <div className="flow-node satellite-node">
                    <div className="flow-icon">🛰️</div>
                    <h4>{routerSimulation.satelliteId}</h4>
                    <p>LEO Satellite</p>
                  </div>

                  <div className="flow-link"><span>Downlink</span></div>

                  <div className="flow-node gateway-node">
                    <div className="flow-icon">🌐</div>
                    <h4>{routerSimulation.gatewayId}</h4>
                    <p>Gateway</p>
                  </div>

                  <div className="flow-link"><span>Core</span></div>

                  <div className="flow-node internet-node">
                    <div className="flow-icon">☁️</div>
                    <h4>Internet</h4>
                    <p>Core Network</p>
                  </div>
                </div>

                <div className="router-status-box">
                  <p>
                    Trạng thái kết nối:{' '}
                    <span className={`badge ${
                      routerSimulation.connectionStatus === 'Connected'
                        ? 'online'
                        : routerSimulation.connectionStatus === 'Warning'
                          ? 'warning'
                          : 'offline'
                    }`}>
                      {routerSimulation.connectionStatus}
                    </span>
                  </p>

                  <p>
                    Trạng thái handover:{' '}
                    <span className={`badge ${
                      routerSimulation.handoverStatus === 'Stable'
                        ? 'online'
                        : 'warning'
                    }`}>
                      {routerSimulation.handoverStatus}
                    </span>
                  </p>
                </div>
              </div>

              <div className="panel">
                <h3>Thông số Router thời gian thực</h3>

                <table>
                  <tbody>
                    <tr><td>Router</td><td>{routerSimulation.routerId}</td></tr>
                    <tr><td>Dịch vụ</td><td>{routerSimulation.serviceType}</td></tr>
                    <tr><td>Vệ tinh đang kết nối</td><td>{routerSimulation.satelliteId}</td></tr>
                    <tr><td>Gateway</td><td>{routerSimulation.gatewayId}</td></tr>
                    <tr><td>C/N</td><td>{routerSimulation.cn} dB</td></tr>
                    <tr><td>Latency</td><td>{routerSimulation.latency} ms</td></tr>
                    <tr><td>Traffic</td><td>{routerSimulation.traffic} Mbps</td></tr>
                    <tr><td>Packet Loss</td><td>{routerSimulation.packetLoss}%</td></tr>
                    <tr><td>Signal Quality</td><td>{routerSimulation.signalQuality}%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <h3>C/N</h3>
                <p>{routerSimulation.cn} dB</p>
              </div>

              <div className="metric-card">
                <h3>Latency</h3>
                <p>{routerSimulation.latency} ms</p>
              </div>

              <div className="metric-card">
                <h3>Traffic</h3>
                <p>{routerSimulation.traffic} Mbps</p>
              </div>

              <div className="metric-card">
                <h3>Packet Loss</h3>
                <p>{routerSimulation.packetLoss}%</p>
              </div>
            </div>

            <div className="panel">
              <h3>Đánh giá hoạt động Router</h3>

              <p>
                Với dịch vụ <strong>{routerSimulation.serviceType}</strong>, Router
                sẽ chọn vệ tinh có liên kết tốt nhất để truyền dữ liệu. Internet/VoIP
                ưu tiên độ trễ thấp, còn dữ liệu ảnh/radar thời tiết ưu tiên băng
                thông và chất lượng tín hiệu.
              </p>

              <div className="signal-quality-bar">
                <div
                  className={`signal-quality-fill ${
                    routerSimulation.signalQuality < 55
                      ? 'signal-bad'
                      : routerSimulation.signalQuality < 75
                        ? 'signal-warning'
                        : 'signal-good'
                  }`}
                  style={{ width: `${routerSimulation.signalQuality}%` }}
                ></div>
              </div>
            </div>
          </section>
        )}

        {activeMenu === 'antenna' && (
          <section className="page">
            <h2>Mô phỏng ăng-ten mảng pha bám bắt vệ tinh</h2>

            <div className="toolbar">
              <select
                value={selectedRouterId}
                onChange={(e) => setSelectedRouterId(e.target.value)}
              >
                {routers.map((router) => (
                  <option key={router.id} value={router.id}>
                    {router.id} - {router.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="tracking-grid">
              <div className="panel antenna-panel">
                <h3>Trực quan hóa bám bắt vệ tinh</h3>

                <div className="tracking-scene">
                  <div className="antenna-base">
                    <div
                      className="antenna-dish"
                      style={{ transform: `rotate(${antennaMetrics.azimuth}deg)` }}
                    >
                      📡
                    </div>

                    <p>{selectedRouter.id}</p>
                    <span>{selectedRouter.location}</span>
                  </div>

                  <div
                    className="beam"
                    style={{ transform: `rotate(${antennaMetrics.azimuth}deg)` }}
                  ></div>

                  <div className="target-satellite">
                    <div className="satellite-icon">🛰️</div>
                    <strong>{bestSatellite.id}</strong>
                    <span>{bestSatellite.coverage}</span>
                  </div>
                </div>

                <div className="tracking-note">
                  Ăng-ten mảng pha tự động điều chỉnh búp sóng để bám vệ tinh có liên kết tốt nhất.
                </div>
              </div>

              <div className="panel">
                <h3>Thông số bám bắt</h3>

                <table>
                  <tbody>
                    <tr><td>Router</td><td>{selectedRouter.id}</td></tr>
                    <tr><td>Vệ tinh đang bám</td><td>{bestSatellite.id}</td></tr>
                    <tr><td>Gateway</td><td>{bestSatellite.gateway}</td></tr>
                    <tr><td>Khoảng cách</td><td>{antennaMetrics.distanceKm} km</td></tr>
                    <tr><td>Azimuth</td><td>{antennaMetrics.azimuth}°</td></tr>
                    <tr><td>Elevation</td><td>{antennaMetrics.elevation}°</td></tr>
                    <tr><td>Sai số bám anten</td><td>{antennaMetrics.pointingError}°</td></tr>
                    <tr><td>Suy hao do mưa</td><td>{antennaMetrics.rainLoss} dB</td></tr>
                    <tr><td>Suy hao khí quyển</td><td>{antennaMetrics.atmosphericLoss} dB</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <h3>C/N</h3>
                <p>{antennaMetrics.cn} dB</p>
              </div>

              <div className="metric-card">
                <h3>Suy hao đường truyền</h3>
                <p>{antennaMetrics.pathLoss} dB</p>
              </div>

              <div className="metric-card">
                <h3>Tổng suy hao</h3>
                <p>{antennaMetrics.totalLoss} dB</p>
              </div>

              <div className="metric-card">
                <h3>Chất lượng tín hiệu</h3>
                <p>{antennaMetrics.signalQuality}%</p>
              </div>
            </div>

            <div className="panel">
              <h3>Đánh giá chất lượng liên kết</h3>

              <div className="signal-quality-bar">
                <div
                  className={`signal-quality-fill ${
                    antennaMetrics.signalQuality < 55
                      ? 'signal-bad'
                      : antennaMetrics.signalQuality < 75
                        ? 'signal-warning'
                        : 'signal-good'
                  }`}
                  style={{ width: `${antennaMetrics.signalQuality}%` }}
                ></div>
              </div>

              <p>
                Trạng thái liên kết:{' '}
                <span className={`badge ${
                  antennaMetrics.linkStatus === 'Good'
                    ? 'online'
                    : antennaMetrics.linkStatus === 'Warning'
                      ? 'warning'
                      : 'offline'
                }`}>
                  {antennaMetrics.linkStatus}
                </span>
              </p>

              <p>
                C/N cao thì tín hiệu ổn định hơn. Khi vệ tinh di chuyển xa Router
                hoặc sai số bám anten tăng, suy hao tăng và chất lượng tín hiệu giảm.
              </p>
            </div>
          </section>
        )}

        {activeMenu === 'traffic' && (
          <section className="page">
            <h2>Giám sát lưu lượng Gateway</h2>

            <div className="panel">
              <h3>Lưu lượng hiện tại</h3>

              {liveGateways.map((gw) => (
                <div className="traffic-row" key={gw.id}>
                  <div className="traffic-info">
                    <strong>{gw.id}</strong>
                    <span>{gw.location}</span>
                  </div>

                  <div className="traffic-bar">
                    <div
                      className={`traffic-fill ${gw.traffic > 400 ? 'traffic-warning' : ''}`}
                      style={{ width: `${(gw.traffic / gw.capacity) * 100}%` }}
                    ></div>
                  </div>

                  <div className="traffic-value">
                    {gw.traffic}/{gw.capacity} Mbps
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <h3>Lịch sử lưu lượng</h3>

              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>GW-HN</th>
                    <th>GW-DN</th>
                    <th>GW-HCM</th>
                  </tr>
                </thead>

                <tbody>
                  {trafficHistory.map((row) => (
                    <tr key={row.time}>
                      <td>{row.time}</td>
                      <td>{row['GW-HN']} Mbps</td>
                      <td>{row['GW-DN']} Mbps</td>
                      <td>{row['GW-HCM']} Mbps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <h3>Quy tắc đánh giá lưu lượng</h3>
              <p>Dưới 400 Mbps: Bình thường</p>
              <p>Từ 400 đến 600 Mbps: Cảnh báo</p>
              <p>Trên 600 Mbps: Quá tải</p>
            </div>
          </section>
        )}

        {activeMenu === 'handover' && (
          <section className="page">
            <h2>Lịch sử Handover và duy trì phiên kết nối</h2>

            <div className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Session ID</th>
                    <th>Dịch vụ</th>
                    <th>Trạng thái phiên</th>
                    <th>Router</th>
                    <th>Vệ tinh</th>
                    <th>Gateway cũ</th>
                    <th>Gateway mới</th>
                    <th>Lý do</th>
                  </tr>
                </thead>

                <tbody>
                  {liveHandoverLogs.map((log, index) => (
                    <tr key={index}>
                      <td>{log.time}</td>
                      <td>{log.sessionId || `SES-${index + 1}`}</td>
                      <td>{log.serviceType || 'Internet/VoIP'}</td>
                      <td><span className="badge online">{log.sessionStatus || 'Maintained'}</span></td>
                      <td>{log.router}</td>
                      <td>{log.satellite}</td>
                      <td>{log.fromGateway}</td>
                      <td>{log.toGateway}</td>
                      <td>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'alerts' && (
          <section className="page">
            <h2>Cảnh báo hệ thống</h2>

            <div className="panel">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div className="big-alert" key={index}>
                    <span>⚠️</span>
                    <p>{alert}</p>
                  </div>
                ))
              ) : (
                <p>Không có cảnh báo trong hệ thống.</p>
              )}
            </div>
          </section>
        )}

        {activeMenu === 'report' && (
          <section className="page">
            <h2>Báo cáo hệ thống</h2>

            <div className="report-grid">
              <div className="panel">
                <h3>Tổng quan</h3>
                <p>Tổng số Gateway: {liveGateways.length}</p>
                <p>Tổng số vệ tinh: {liveSatellites.length}</p>
                <p>Tổng số Router: {routers.length}</p>
                <p>Tổng lưu lượng hiện tại: {totalTraffic} Mbps</p>
                <p>Số sự kiện handover: {liveHandoverLogs.length}</p>
              </div>

              <div className="panel">
                <h3>Đánh giá trạng thái</h3>
                <p>Gateway Online: {onlineGateways}/{liveGateways.length}</p>
                <p>Vệ tinh Online: {onlineSatellites}/{liveSatellites.length}</p>
                <p>Router đang kết nối: {activeRouters}/{routers.length}</p>
                <p>Số cảnh báo: {alerts.length}</p>
              </div>

              <div className="panel">
                <h3>Nhận xét</h3>
                <p>
                  Dashboard đã mô phỏng được quá trình vệ tinh LEO di chuyển và
                  thay đổi Gateway theo vùng phủ. Khi Gateway thay đổi, hệ thống
                  tự động ghi nhận sự kiện handover.
                </p>

                <p>
                  Phần Router Simulation trực quan hóa hoạt động của Router người
                  dùng theo thời gian thực, bao gồm luồng Router → Vệ tinh → Gateway
                  → Internet, C/N, latency, traffic, packet loss và trạng thái handover.
                </p>

                <p>
                  Gateway được cập nhật theo thời gian thực, bao gồm lưu lượng,
                  số Router đang kết nối, vệ tinh liên kết và thời điểm cập nhật.
                </p>
              </div>
            </div>

            <div className="panel threshold-panel">
              <h3>Bảng ngưỡng đánh giá hệ thống</h3>

              <table>
                <thead>
                  <tr>
                    <th>Thông số</th>
                    <th>Ngưỡng</th>
                    <th>Đánh giá</th>
                    <th>Ý nghĩa</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>C/N</td>
                    <td>{'>= 12 dB'}</td>
                    <td><span className="badge online">Good</span></td>
                    <td>Liên kết ổn định, chất lượng tín hiệu tốt</td>
                  </tr>

                  <tr>
                    <td>C/N</td>
                    <td>8 - 12 dB</td>
                    <td><span className="badge warning">Warning</span></td>
                    <td>Tín hiệu yếu, cần theo dõi</td>
                  </tr>

                  <tr>
                    <td>C/N</td>
                    <td>{'< 8 dB'}</td>
                    <td><span className="badge offline">Poor</span></td>
                    <td>Liên kết kém, có nguy cơ mất kết nối</td>
                  </tr>

                  <tr>
                    <td>Traffic Gateway</td>
                    <td>{'< 400 Mbps'}</td>
                    <td><span className="badge online">Normal</span></td>
                    <td>Gateway hoạt động bình thường</td>
                  </tr>

                  <tr>
                    <td>Traffic Gateway</td>
                    <td>400 - 600 Mbps</td>
                    <td><span className="badge warning">Warning</span></td>
                    <td>Gateway có lưu lượng cao</td>
                  </tr>

                  <tr>
                    <td>Traffic Gateway</td>
                    <td>{'> 600 Mbps'}</td>
                    <td><span className="badge offline">Overload</span></td>
                    <td>Gateway quá tải</td>
                  </tr>

                  <tr>
                    <td>Last Seen</td>
                    <td>{'<= 10s'}</td>
                    <td><span className="badge online">Alive</span></td>
                    <td>Thiết bị đang phản hồi bình thường</td>
                  </tr>

                  <tr>
                    <td>Last Seen</td>
                    <td>10 - 20s</td>
                    <td><span className="badge warning">Warning</span></td>
                    <td>Thiết bị phản hồi chậm</td>
                  </tr>

                  <tr>
                    <td>Last Seen</td>
                    <td>{'> 20s'}</td>
                    <td><span className="badge offline">Dead</span></td>
                    <td>Thiết bị không phản hồi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
