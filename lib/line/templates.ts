import type { messagingApi } from '@line/bot-sdk'

/**
 * LINE Flex Message 模板
 * 所有推播訊息的模板集中管理
 */

// ── 綁定成功通知 ──
export function bindSuccessMessage(
  studentNames: string[]
): messagingApi.FlexMessage {
  const nameItems: messagingApi.FlexComponent[] = studentNames.map((name) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: '✅', size: 'sm', flex: 0 },
      { type: 'text', text: name, size: 'sm', color: '#333333', margin: 'sm', flex: 1 },
    ],
  }))

  return {
    type: 'flex',
    altText: '帳號綁定成功！',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '🎵 帳號綁定成功！',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '已綁定學生：', size: 'sm', color: '#888888', weight: 'bold' },
          ...nameItems,
          { type: 'separator', margin: 'lg' },
          {
            type: 'text',
            text: '您將收到以下通知：',
            size: 'sm',
            color: '#888888',
            weight: 'bold',
            margin: 'lg',
          },
          { type: 'text', text: '• 請假/補課處理結果', size: 'sm', color: '#555555' },
          { type: 'text', text: '• 課程異動通知', size: 'sm', color: '#555555' },
          { type: 'text', text: '• 學費繳費提醒', size: 'sm', color: '#555555' },
        ],
      },
    },
  }
}

// ── 歡迎訊息（加入好友時發送）──
export function welcomeMessage(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: '歡迎加入音樂補習班！',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '🎵 歡迎加入音樂補習班！',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '請點擊下方「綁定帳號」完成帳號綁定，即可收到課程通知、學費提醒等訊息。',
            size: 'sm',
            color: '#555555',
            wrap: true,
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'text',
            text: '綁定步驟：',
            size: 'sm',
            color: '#888888',
            weight: 'bold',
            margin: 'lg',
          },
          { type: 'text', text: '1️⃣ 點擊選單「綁定帳號」', size: 'sm', color: '#555555' },
          { type: 'text', text: '2️⃣ 輸入報名時填寫的手機號碼', size: 'sm', color: '#555555' },
          { type: 'text', text: '3️⃣ 選擇要綁定的學生', size: 'sm', color: '#555555' },
          { type: 'text', text: '4️⃣ 完成！開始接收通知', size: 'sm', color: '#555555' },
        ],
      },
    },
  }
}

// ── 綁定引導（按鈕開啟 LIFF）──
export function bindGuideMessage(liffId: string, path = '/bind'): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: '請點擊按鈕進行帳號綁定',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '🔗 帳號綁定', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '請點擊下方按鈕，依照步驟完成帳號綁定。',
            size: 'sm',
            color: '#555555',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#6366f1',
            action: {
              type: 'uri',
              label: '開始綁定帳號',
              uri: `https://liff.line.me/${liffId}${path}`,
            },
          },
        ],
      },
    },
  }
}

// ── LIFF 頁面引導（通用）──
export function liffGuideMessage(params: {
  liffId: string
  path: string
  title: string
  icon: string
  description: string
  buttonLabel: string
  color?: string
}): messagingApi.FlexMessage {
  const { liffId, path, title, icon, description, buttonLabel, color = '#6366f1' } = params
  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `${icon} ${title}`, color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: description, size: 'sm', color: '#555555', wrap: true },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color,
            action: {
              type: 'uri',
              label: buttonLabel,
              uri: `https://liff.line.me/${liffId}${path}`,
            },
          },
        ],
      },
    },
  }
}

// ── 角色中文標籤 ──
function roleLabel(role: string): string {
  switch (role) {
    case 'family': return '家長'
    case 'teacher': return '教師'
    case 'admin': return '管理員'
    default: return role
  }
}

// ── 綁定狀態查詢（已綁定）──
export function bindStatusMessage(
  users: Array<{ name: string; role: string }>
): messagingApi.FlexMessage {
  const userItems: messagingApi.FlexComponent[] = users.map((u) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: u.role === 'teacher' ? '👨‍🏫' : '👨‍🎓', size: 'sm', flex: 0 },
      { type: 'text', text: u.name, size: 'sm', color: '#333333', margin: 'sm', flex: 3 },
      { type: 'text', text: roleLabel(u.role), size: 'xs', color: '#888888', align: 'end' as const, flex: 1 },
    ],
  }))

  return {
    type: 'flex',
    altText: '帳號綁定狀態',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 帳號綁定狀態', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '已綁定帳號：', size: 'sm', color: '#888888', weight: 'bold' },
          ...userItems,
          { type: 'separator', margin: 'lg' },
          {
            type: 'text',
            text: '如需解除綁定，請至綁定頁面操作。',
            size: 'xs',
            color: '#aaaaaa',
            margin: 'lg',
            wrap: true,
          },
        ],
      },
    },
  }
}

// ── 綁定狀態查詢（未綁定）──
export function notBoundMessage(): messagingApi.FlexMessage {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID

  const contents: messagingApi.FlexComponent[] = [
    {
      type: 'text',
      text: '您尚未綁定任何帳號。\n綁定後即可收到課程通知、學費提醒等訊息。',
      size: 'sm',
      color: '#555555',
      wrap: true,
    },
  ]

  const footer = liffId ? {
    type: 'box' as const,
    layout: 'vertical' as const,
    contents: [
      {
        type: 'button' as const,
        style: 'primary' as const,
        color: '#6366f1',
        action: {
          type: 'uri' as const,
          label: '立即綁定帳號',
          uri: `https://liff.line.me/${liffId}/bind`,
        },
      },
    ],
  } : undefined

  return {
    type: 'flex',
    altText: '您尚未綁定帳號',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 帳號綁定狀態', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents,
      },
      ...(footer ? { footer } : {}),
    },
  }
}

// ── 請假結果通知 ──
export function leaveResultMessage(params: {
  studentName: string
  courseName: string
  date: string
  result: 'approved' | 'approved_makeup' | 'rejected'
  reason?: string
  makeupInfo?: { date: string; room: string; teacher: string }
}): messagingApi.FlexMessage {
  const { studentName, courseName, date, result, reason, makeupInfo } = params

  const resultText =
    result === 'approved'
      ? '✅ 已核准（不補課）'
      : result === 'approved_makeup'
        ? '✅ 已核准（安排補課）'
        : '❌ 未通過'

  const resultColor = result === 'rejected' ? '#dc2626' : '#16a34a'

  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `學生：${studentName}`, size: 'sm', color: '#333333' },
        { type: 'text', text: `課程：${courseName}`, size: 'sm', color: '#333333' },
        { type: 'text', text: `日期：${date}`, size: 'sm', color: '#333333' },
        { type: 'text', text: `結果：${resultText}`, size: 'sm', color: resultColor, weight: 'bold' },
      ],
    },
  ]

  if (reason && result === 'rejected') {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      contents: [
        { type: 'text', text: `原因：${reason}`, size: 'sm', color: '#666666', wrap: true },
      ],
    })
  }

  if (makeupInfo && result === 'approved_makeup') {
    bodyContents.push(
      { type: 'separator', margin: 'lg' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'lg',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '補課安排：', size: 'sm', color: '#888888', weight: 'bold' },
          { type: 'text', text: `📅 ${makeupInfo.date}`, size: 'sm', color: '#333333' },
          { type: 'text', text: `🏫 ${makeupInfo.room}`, size: 'sm', color: '#333333' },
          { type: 'text', text: `👨‍🏫 ${makeupInfo.teacher}`, size: 'sm', color: '#333333' },
        ],
      }
    )
  }

  return {
    type: 'flex',
    altText: `【${studentName}】請假處理通知`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '📋 請假處理通知', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: bodyContents,
      },
    },
  }
}

// ── 點數獲得通知 ──
export function pointsEarnedMessage(params: {
  studentName: string
  amount: number
  reason: string
  balance?: number
}): messagingApi.FlexMessage {
  const { studentName, amount, reason, balance } = params

  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '學生', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: studentName, size: 'sm', color: '#333333', flex: 3, weight: 'bold' },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '獲得點數', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: `+${amount} 點`, size: 'sm', color: '#16a34a', flex: 3, weight: 'bold' },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '原因', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: reason, size: 'sm', color: '#555555', flex: 3, wrap: true },
      ],
    },
  ]

  if (balance !== undefined) {
    bodyContents.push({ type: 'separator', margin: 'md' })
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: '累計點數', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: `${balance} 點`, size: 'sm', color: '#6366f1', flex: 3, weight: 'bold' },
      ],
    })
  }

  return {
    type: 'flex',
    altText: `【${studentName}】獲得 ${amount} 點獎勵！`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f59e0b',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '⭐ 獲得點數獎勵！', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: bodyContents,
      },
    },
  }
}

// ── 通用文字推播（附學生姓名）──
export function generalNotifyMessage(
  studentName: string,
  title: string,
  body: string
): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `【${studentName}】${title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#6366f1',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `📢 ${title}`, color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: `學生：${studentName}`, size: 'sm', color: '#888888', weight: 'bold' },
          { type: 'separator' },
          { type: 'text', text: body, size: 'sm', color: '#333333', wrap: true, margin: 'md' },
        ],
      },
    },
  }
}

// ── 學費繳費提醒 ──
export function tuitionReminderMessage(params: {
  studentName: string
  amount?: number
  dueDate?: string
  note?: string
}): messagingApi.FlexMessage {
  const { studentName, amount, dueDate, note } = params
  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '學生', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: studentName, size: 'sm', color: '#333333', flex: 3, weight: 'bold' },
      ],
    },
  ]
  if (amount !== undefined) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '應繳金額', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: `NT$ ${amount.toLocaleString()}`, size: 'sm', color: '#ea580c', flex: 3, weight: 'bold' },
      ],
    })
  }
  if (dueDate) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '繳費期限', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: dueDate, size: 'sm', color: '#dc2626', flex: 3, weight: 'bold' },
      ],
    })
  }
  bodyContents.push({ type: 'separator', margin: 'lg' })
  bodyContents.push({
    type: 'text',
    text: note ?? '請於期限前完成繳費，如有疑問請聯絡補習班。',
    size: 'xs',
    color: '#888888',
    wrap: true,
    margin: 'lg',
  })

  return {
    type: 'flex',
    altText: `【${studentName}】學費繳費提醒`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ea580c',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '💰 學費繳費提醒', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: bodyContents,
      },
    },
  }
}

// ── 學費收訖通知 ──
export function tuitionReceivedMessage(params: {
  studentName: string
  amount?: number
  paidDate?: string
  note?: string
}): messagingApi.FlexMessage {
  const { studentName, amount, paidDate, note } = params
  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '學生', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: studentName, size: 'sm', color: '#333333', flex: 3, weight: 'bold' },
      ],
    },
  ]
  if (amount !== undefined) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '收款金額', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: `NT$ ${amount.toLocaleString()}`, size: 'sm', color: '#16a34a', flex: 3, weight: 'bold' },
      ],
    })
  }
  if (paidDate) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '繳費日期', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: paidDate, size: 'sm', color: '#333333', flex: 3 },
      ],
    })
  }
  bodyContents.push({ type: 'separator', margin: 'lg' })
  bodyContents.push({
    type: 'text',
    text: note ?? '感謝您的繳費！如有任何問題，歡迎聯絡我們。',
    size: 'xs',
    color: '#888888',
    wrap: true,
    margin: 'lg',
  })

  return {
    type: 'flex',
    altText: `【${studentName}】學費已收訖`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16a34a',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '✅ 學費收訖通知', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: bodyContents,
      },
    },
  }
}

// ── 課程異動通知 ──
export function courseChangeMessage(params: {
  studentName: string
  courseName?: string
  changeType?: string
  originalDate?: string
  newDate?: string
  note?: string
}): messagingApi.FlexMessage {
  const { studentName, courseName, changeType, originalDate, newDate, note } = params
  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '學生', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: studentName, size: 'sm', color: '#333333', flex: 3, weight: 'bold' },
      ],
    },
  ]
  if (courseName) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '課程', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: courseName, size: 'sm', color: '#333333', flex: 3 },
      ],
    })
  }
  if (changeType) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '異動類型', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: changeType, size: 'sm', color: '#2563eb', flex: 3, weight: 'bold' },
      ],
    })
  }
  if (originalDate) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '原定時間', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: originalDate, size: 'sm', color: '#6b7280', flex: 3, decoration: 'line-through' },
      ],
    })
  }
  if (newDate) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '更新時間', size: 'sm', color: '#888888', flex: 2 },
        { type: 'text', text: newDate, size: 'sm', color: '#2563eb', flex: 3, weight: 'bold' },
      ],
    })
  }
  bodyContents.push({ type: 'separator', margin: 'lg' })
  bodyContents.push({
    type: 'text',
    text: note ?? '如有任何疑問，請聯絡補習班確認。',
    size: 'xs',
    color: '#888888',
    wrap: true,
    margin: 'lg',
  })

  return {
    type: 'flex',
    altText: `【${studentName}】課程異動通知`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2563eb',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '📅 課程異動通知', color: '#ffffff', size: 'lg', weight: 'bold' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: bodyContents,
      },
    },
  }
}
