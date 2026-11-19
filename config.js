// ★ 설정은 이 파일의 API_URL 한 줄만 바꾸면 됩니다. (Apps Script 웹 앱 URL)
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwzMevodnq_H_XlmCncE-nwZ4W7UtReaiG8yQ5uU5f83OpejNun1oYqK8J5mytU-IQ37g/exec',

  // 화면 제목
  TITLE: '유휴 설비 관제',

  // 아래는 필드설정 시트의 "필드명"과 맞춰져 있습니다. (이름을 바꿨을 때만 수정)
  F: {
    name: '설비명',
    status: '설비상태',
    assetNo: '자산번호',
    cost: '취득가액',
    residual: '잔존가액',
    size: '사이즈',
    photo: '설비사진',
    location: '위치'
  },

  // QR에 들어갈 주소의 기준 (비워두면 현재 사이트 주소를 자동 사용)
  BASE_URL: ''
};
