// 갯마을 식당 네트워크 그래프 애플리케이션

class NetworkGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    
    // 설정
    this.config = {
      nodeRadius: 25,
      fontSize: 12,
      lineWidth: 2,
      arrowSize: 8,
      colors: {
        'receipt': '#667eea',
        'weather': '#10b981',
        'table': '#f59e0b',
        'menu-sashimi': '#ec4899',
        'menu-food': '#8b5cf6',
        'menu-drink': '#06b6d4'
      },
      nodeIcons: {
        'receipt': '🧾',
        'weather': '☀️',
        'table': '🪑',
        'menu-sashimi': '🐟',
        'menu-food': '🍚',
        'menu-drink': '🍺'
      }
    };
    
    // 물리 시뮬레이션 설정
    this.simulation = {
      centerForce: 0.005,
      repelForce: 2000,
      attractForce: 0.005,
      damping: 0.9,
      maxSpeed: 5
    };
    
    // 카메라 설정
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1
    };
    
    // 드래그 상태
    this.dragging = {
      active: false,
      node: null,
      startX: 0,
      startY: 0,
      isPanning: false
    };
    
    this.init();
  }
  
  init() {
    this.resizeCanvas();
    this.loadData();
    this.setupEventListeners();
    this.animate();
  }
  
  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }
  
  loadData() {
    try {
      // data.js에서 임베드된 데이터 먼저 확인
      if (window.GRAPH_DATA) {
        console.log('임베드된 데이터 로드 완료:', window.GRAPH_DATA);
        this.setData(window.GRAPH_DATA);
        return;
      }
      
      // 외부 JSON 파일 로드 시도
      fetch('graph-data.json')
        .then(response => {
          if (!response.ok) throw new Error('JSON 파일 로드 실패');
          return response.json();
        })
        .then(data => {
          console.log('외부 JSON 데이터 로드 완료:', data);
          this.setData(data);
        })
        .catch(error => {
          console.error('데이터 로드 실패:', error);
          // 기본 샘플 데이터
          this.setData({
            nodes: [
              {
                id: 'sample-1',
                type: 'receipt',
                label: '샘플 노드',
                data: {}
              }
            ],
            edges: []
          });
          this.showToast('기본 샘플 데이터를 사용합니다.', 'error');
        });
    } catch (error) {
      console.error('데이터 로드 중 오류:', error);
    }
  }
  
  setData(data) {
    // 노드 초기화
    this.nodes = data.nodes.map((node, i) => {
      const angle = i * 2 * Math.PI / data.nodes.length;
      const radius = 150; // 더 작은 반경으로 시작
      
      return {
        ...node,
        x: Math.cos(angle) * radius + this.canvas.width / 2,
        y: Math.sin(angle) * radius + this.canvas.height / 2,
        vx: 0,
        vy: 0,
        visible: true
      };
    });
    
    // 엣지 초기화
    this.edges = data.edges.map(edge => ({
      ...edge,
      visible: true
    }));
    
    console.log(`노드 ${this.nodes.length}개, 엣지 ${this.edges.length}개 로드됨`);
    this.updateStats();
    this.updateFilters();
  }
  
  setupEventListeners() {
    // 캔버스 이벤트
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
    
    // 창 크기 변경
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
    
    // 버튼 이벤트
    document.getElementById('btn-add-node')?.addEventListener('click', () => {
      this.openModal('modal-add-node');
      this.populateNodeSelects();
    });
    
    document.getElementById('btn-add-edge')?.addEventListener('click', () => {
      this.openModal('modal-add-edge');
      this.populateEdgeSelects();
    });
    
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('btn-import')?.addEventListener('click', () => {
      this.importData();
    });
    
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.resetLayout();
    });
    
    // 필터 체크박스
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleNodeType(e.target.dataset.type, e.target.checked);
      });
    });
    
    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) this.closeModal(modal.id);
      });
    });
    
    // 폼 제출
    document.getElementById('form-add-node')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNode();
    });
    
    document.getElementById('form-add-edge')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addEdge();
    });
  }
  
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = this.getNodeAtPosition(x, y);
    
    if (node) {
      this.dragging.active = true;
      this.dragging.node = node;
      this.dragging.startX = x;
      this.dragging.startY = y;
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.dragging.isPanning = true;
      this.dragging.startX = x;
      this.dragging.startY = y;
      this.canvas.style.cursor = 'grabbing';
    }
  }
  
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (this.dragging.active && this.dragging.node) {
      const dx = x - this.dragging.startX;
      const dy = y - this.dragging.startY;
      
      this.dragging.node.x += dx / this.camera.zoom;
      this.dragging.node.y += dy / this.camera.zoom;
      
      this.dragging.startX = x;
      this.dragging.startY = y;
    } else if (this.dragging.isPanning) {
      const dx = x - this.dragging.startX;
      const dy = y - this.dragging.startY;
      
      this.camera.x += dx;
      this.camera.y += dy;
      
      this.dragging.startX = x;
      this.dragging.startY = y;
    } else {
      const node = this.getNodeAtPosition(x, y);
      this.canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  }
  
  onMouseUp() {
    this.dragging.active = false;
    this.dragging.node = null;
    this.dragging.isPanning = false;
    this.canvas.style.cursor = 'grab';
  }
  
  onWheel(e) {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, this.camera.zoom * zoomFactor));
    
    // 마우스 위치를 중심으로 줌
    const worldX = (x - this.camera.x) / this.camera.zoom;
    const worldY = (y - this.camera.y) / this.camera.zoom;
    
    this.camera.zoom = newZoom;
    
    this.camera.x = x - worldX * this.camera.zoom;
    this.camera.y = y - worldY * this.camera.zoom;
  }
  
  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = this.getNodeAtPosition(x, y);
    
    if (node) {
      this.selectNode(node);
    } else {
      this.deselectNode();
    }
  }
  
  getNodeAtPosition(x, y) {
    const worldX = (x - this.camera.x) / this.camera.zoom;
    const worldY = (y - this.camera.y) / this.camera.zoom;
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (!node.visible) continue;
      
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.config.nodeRadius) {
        return node;
      }
    }
    
    return null;
  }
  
  selectNode(node) {
    this.selectedNode = node;
    this.showNodeDetails(node);
  }
  
  deselectNode() {
    this.selectedNode = null;
    this.hideNodeDetails();
  }
  
  showNodeDetails(node) {
    const panel = document.getElementById('detail-panel-content');
    if (!panel) return;
    
    const typeLabel = {
      'receipt': '영수증',
      'weather': '날씨',
      'table': '테이블',
      'menu-sashimi': '회 메뉴',
      'menu-food': '식사 메뉴',
      'menu-drink': '주류'
    }[node.type] || node.type;
    
    const icon = this.config.nodeIcons[node.type] || '📌';
    const color = this.config.colors[node.type] || '#999';
    
    let dataRows = '';
    if (node.data && typeof node.data === 'object') {
      for (let [key, value] of Object.entries(node.data)) {
        dataRows += `
          <div class="data-row">
            <div class="data-label">${key}</div>
            <div class="data-value">
              <input type="text" value="${value}" data-key="${key}" />
            </div>
          </div>
        `;
      }
    }
    
    panel.innerHTML = `
      <div class="node-details">
        <div class="node-header">
          <div class="node-type-badge" style="background-color: ${color}">
            ${icon}
          </div>
          <div class="node-title">
            <h3>${node.label}</h3>
            <div class="type-label">${typeLabel}</div>
          </div>
        </div>
        
        <div class="data-table">
          <div class="data-row">
            <div class="data-label">ID</div>
            <div class="data-value">${node.id}</div>
          </div>
          <div class="data-row">
            <div class="data-label">타입</div>
            <div class="data-value">${typeLabel}</div>
          </div>
          ${dataRows}
        </div>
        
        <div class="button-group">
          <button class="btn btn-success" onclick="app.saveNodeData()">
            💾 저장
          </button>
          <button class="btn btn-danger" onclick="app.deleteNode()">
            🗑️ 삭제
          </button>
        </div>
      </div>
    `;
  }
  
  hideNodeDetails() {
    const panel = document.getElementById('detail-panel-content');
    if (!panel) return;
    
    panel.innerHTML = `
      <div class="no-selection">
        <div class="no-selection-icon">🎯</div>
        <p>노드를 클릭하여<br>상세 정보를 확인하세요</p>
      </div>
    `;
  }
  
  saveNodeData() {
    if (!this.selectedNode) return;
    
    const inputs = document.querySelectorAll('#detail-panel-content input[data-key]');
    inputs.forEach(input => {
      const key = input.dataset.key;
      this.selectedNode.data[key] = input.value;
    });
    
    this.showToast('변경사항이 저장되었습니다.', 'success');
  }
  
  deleteNode() {
    if (!this.selectedNode) return;
    
    if (!confirm(`"${this.selectedNode.label}" 노드를 삭제하시겠습니까?\n연결된 엣지도 함께 삭제됩니다.`)) {
      return;
    }
    
    const nodeId = this.selectedNode.id;
    
    // 노드 삭제
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    
    // 연결된 엣지 삭제
    this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    this.deselectNode();
    this.updateStats();
    this.showToast('노드가 삭제되었습니다.', 'success');
  }
  
  addNode() {
    const id = document.getElementById('node-id').value;
    const type = document.getElementById('node-type').value;
    const label = document.getElementById('node-label').value;
    
    // 중복 ID 체크
    if (this.nodes.find(n => n.id === id)) {
      this.showToast('이미 존재하는 ID입니다.', 'error');
      return;
    }
    
    const newNode = {
      id,
      type,
      label,
      data: {},
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      vx: 0,
      vy: 0,
      visible: true
    };
    
    this.nodes.push(newNode);
    this.closeModal('modal-add-node');
    this.updateStats();
    this.updateFilters();
    this.showToast('노드가 추가되었습니다.', 'success');
    
    // 폼 초기화
    document.getElementById('form-add-node').reset();
  }
  
  addEdge() {
    const source = document.getElementById('edge-source').value;
    const target = document.getElementById('edge-target').value;
    const type = document.getElementById('edge-type').value;
    const label = document.getElementById('edge-label').value;
    
    if (source === target) {
      this.showToast('소스와 타겟이 같을 수 없습니다.', 'error');
      return;
    }
    
    const newEdge = {
      id: `edge-${Date.now()}`,
      source,
      target,
      type,
      label,
      visible: true
    };
    
    this.edges.push(newEdge);
    this.closeModal('modal-add-edge');
    this.updateStats();
    this.showToast('엣지가 추가되었습니다.', 'success');
    
    // 폼 초기화
    document.getElementById('form-add-edge').reset();
  }
  
  toggleNodeType(type, visible) {
    this.nodes.forEach(node => {
      if (node.type === type) {
        node.visible = visible;
      }
    });
    
    // 엣지 가시성도 업데이트
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      edge.visible = sourceNode?.visible && targetNode?.visible;
    });
    
    this.updateStats();
  }
  
  exportData() {
    const data = {
      nodes: this.nodes.map(({ x, y, vx, vy, visible, ...node }) => node),
      edges: this.edges.map(({ visible, ...edge }) => edge)
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-data.json';
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('데이터가 내보내기되었습니다.', 'success');
  }
  
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this.setData(data);
          this.showToast('데이터가 가져오기되었습니다.', 'success');
        } catch (error) {
          this.showToast('잘못된 JSON 파일입니다.', 'error');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }
  
  resetLayout() {
    const radius = 150; // 더 작은 반경
    
    this.nodes.forEach((node, i) => {
      const angle = i * 2 * Math.PI / this.nodes.length;
      node.x = Math.cos(angle) * radius + this.canvas.width / 2;
      node.y = Math.sin(angle) * radius + this.canvas.height / 2;
      node.vx = 0;
      node.vy = 0;
    });
    
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.showToast('레이아웃이 초기화되었습니다.', 'success');
  }
  
  updateStats() {
    const visibleNodes = this.nodes.filter(n => n.visible).length;
    const visibleEdges = this.edges.filter(e => e.visible).length;
    
    const statNodes = document.getElementById('stat-nodes');
    const statEdges = document.getElementById('stat-edges');
    
    if (statNodes) statNodes.textContent = visibleNodes;
    if (statEdges) statEdges.textContent = visibleEdges;
    
    // 캔버스 오버레이 업데이트
    const overlay = document.querySelector('.canvas-overlay');
    if (overlay) {
      overlay.innerHTML = `<strong>노드:</strong> ${visibleNodes} / ${this.nodes.length} &nbsp; <strong>엣지:</strong> ${visibleEdges}`;
    }
  }
  
  updateFilters() {
    // 필터 체크박스 초기화는 이미 HTML에서 checked로 되어있음
  }
  
  populateNodeSelects() {
    // 엣지 추가 모달에서 사용할 셀렉트 박스 채우기는 populateEdgeSelects에서 처리
  }
  
  populateEdgeSelects() {
    const sourceSelect = document.getElementById('edge-source');
    const targetSelect = document.getElementById('edge-target');
    
    if (!sourceSelect || !targetSelect) return;
    
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    
    this.nodes.forEach(node => {
      const option1 = document.createElement('option');
      option1.value = node.id;
      option1.textContent = `${node.label} (${node.id})`;
      sourceSelect.appendChild(option1);
      
      const option2 = document.createElement('option');
      option2.value = node.id;
      option2.textContent = `${node.label} (${node.id})`;
      targetSelect.appendChild(option2);
    });
  }
  
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
  
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    if (!toast || !icon || !messageEl) return;
    
    toast.className = 'toast';
    toast.classList.add('active', type);
    
    icon.textContent = type === 'success' ? '✓' : '✗';
    messageEl.textContent = message;
    
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3000);
  }
  
  // 물리 시뮬레이션
  updatePhysics() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 노드별 힘 계산
    this.nodes.forEach(node => {
      if (!node.visible) return;
      
      let fx = 0;
      let fy = 0;
      
      // 중심으로 향하는 힘
      fx += (centerX - node.x) * this.simulation.centerForce;
      fy += (centerY - node.y) * this.simulation.centerForce;
      
      // 다른 노드와의 반발력
      this.nodes.forEach(other => {
        if (other === node || !other.visible) return;
        
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        if (dist < 150) {
          const force = this.simulation.repelForce / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      });
      
      // 연결된 노드와의 인력
      this.edges.forEach(edge => {
        if (!edge.visible) return;
        
        let other = null;
        let direction = 1;
        
        if (edge.source === node.id) {
          other = this.nodes.find(n => n.id === edge.target);
          direction = 1;
        } else if (edge.target === node.id) {
          other = this.nodes.find(n => n.id === edge.source);
          direction = -1;
        }
        
        if (other && other.visible) {
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          fx += dx * this.simulation.attractForce * direction;
          fy += dy * this.simulation.attractForce * direction;
        }
      });
      
      // 속도 업데이트
      node.vx = (node.vx + fx) * this.simulation.damping;
      node.vy = (node.vy + fy) * this.simulation.damping;
      
      // 최대 속도 제한
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > this.simulation.maxSpeed) {
        node.vx = (node.vx / speed) * this.simulation.maxSpeed;
        node.vy = (node.vy / speed) * this.simulation.maxSpeed;
      }
      
      // 위치 업데이트 (드래그 중이 아닐 때만)
      if (this.dragging.node !== node) {
        node.x += node.vx;
        node.y += node.vy;
        
        // 경계 제한 - 노드가 화면 밖으로 나가지 않도록
        const margin = 50;
        if (node.x < margin) {
          node.x = margin;
          node.vx = 0;
        }
        if (node.x > this.canvas.width - margin) {
          node.x = this.canvas.width - margin;
          node.vx = 0;
        }
        if (node.y < margin) {
          node.y = margin;
          node.vy = 0;
        }
        if (node.y > this.canvas.height - margin) {
          node.y = this.canvas.height - margin;
          node.vy = 0;
        }
      }
    });
  }
  
  // 렌더링
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    
    // 엣지 그리기
    this.edges.forEach(edge => {
      if (!edge.visible) return;
      
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode || !sourceNode.visible || !targetNode.visible) return;
      
      this.drawEdge(sourceNode, targetNode, edge);
    });
    
    // 노드 그리기
    this.nodes.forEach(node => {
      if (!node.visible) return;
      this.drawNode(node);
    });
    
    this.ctx.restore();
  }
  
  drawNode(node) {
    const x = node.x;
    const y = node.y;
    const radius = this.config.nodeRadius;
    const color = this.config.colors[node.type] || '#999';
    
    // 선택된 노드 표시
    if (node === this.selectedNode) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
    
    // 노드 원
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // 아이콘
    const icon = this.config.nodeIcons[node.type] || '📌';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(icon, x, y);
    
    // 라벨
    this.ctx.font = `${this.config.fontSize}px Arial`;
    this.ctx.fillStyle = '#333';
    this.ctx.fillText(node.label, x, y + radius + 15);
  }
  
  drawEdge(source, target, edge) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return;
    
    const unitX = dx / dist;
    const unitY = dy / dist;
    
    const startX = source.x + unitX * this.config.nodeRadius;
    const startY = source.y + unitY * this.config.nodeRadius;
    const endX = target.x - unitX * this.config.nodeRadius;
    const endY = target.y - unitY * this.config.nodeRadius;
    
    // 선 그리기
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.stroke();
    
    // 화살표 그리기
    const arrowSize = this.config.arrowSize;
    const angle = Math.atan2(dy, dx);
    
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fillStyle = '#ccc';
    this.ctx.fill();
  }
  
  animate() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// 앱 시작
let app;

window.addEventListener('DOMContentLoaded', () => {
  app = new NetworkGraph('graph-canvas');
});
