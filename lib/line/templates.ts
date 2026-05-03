import type { messagingApi } from '@line/bot-sdk'

/**
 * LINE Flex Message 模板 - 款式 A：童趣果凍風 (Jelly Kids)
 * 統一風格規範：
 * 1. Header: 高飽和底色（#FFDF6F, #FF9966, #66CCCC, #F56E4A），置中大標題。
 * 2. Body: 使用 bg-[#f8fafc] 的圓角區塊 (cornerRadius: 12px) 呈現 Key-Value 資料，保持一致的文字排版。
 * 3. Footer: 大圓角按鈕，字體加粗。
 */

// ── 共用元件生成器 ──
function createRow(key: string, value: string, valueColor = '#334155'): messagingApi.FlexComponent {
  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor: '#f8fafc',
    paddingAll: '12px',
    cornerRadius: '12px',
    margin: 'sm',
    contents: [
      { type: 'text', text: key, color: '#94a3b8', size: 'xs', flex: 2, weight: 'bold', align: 'start' },
      { type: 'text', text: value, color: valueColor, size: 'sm', flex: 5, weight: 'bold', align: 'end', wrap: true }
    ]
  }
}

function createTextList(items: string[]): messagingApi.FlexComponent {
  return {
    type: 'text',
    text: items.join('\n'),
    color: '#64748b',
    size: 'xs',
    weight: 'bold',
    wrap: true,
    margin: 'sm'
  }
}

function createButton(label: string, uri: string, color: string): messagingApi.FlexComponent {
  return {
    type: 'button',
    style: 'primary',
    color: color,
    height: 'sm',
    action: { type: 'uri', label, uri }
  }
}

// ── 日期格式化小工具 ──
function formatChineseDate(dateStr?: string): string {
  if (!dateStr) return '未知日期'
  const match = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(.*)$/)
  if (match) {
    const [_, year, month, day, rest] = match
    return `${year}年${month}月${day}日${rest}`
  }
  return dateStr
}

// ── 綁定成功通知 ──
export function bindSuccessMessage(studentNames: string[]): messagingApi.FlexMessage {
  const nameRows = studentNames.map(name => createRow('學生', name))
  return {
    type: 'flex',
    altText: '帳號綁定成功！',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '🔗 帳號綁定成功', color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '已綁定帳號', color: '#94a3b8', size: 'xs', weight: 'bold' },
          ...nameRows,
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: '您將收到以下通知：', color: '#94a3b8', size: 'xs', weight: 'bold', margin: 'xl' },
          createTextList(['• 請假 / 補課處理結果', '• 課程異動通知', '• 學費繳費提醒'])
        ]
      }
    }
  }
}

// ── 解除綁定通知 ──
export function unbindNotifyMessage(userName: string, operator: 'self' | 'admin'): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: '帳號已解除 LINE 綁定',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ef4444',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '⚠️ 帳號解除綁定', color: '#ffffff', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          createRow('成員', userName),
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          {
            type: 'text',
            text: operator === 'self' ? '您已手動解除此帳號的 LINE 連結。' : '管理員已解除此帳號的 LINE 連結。',
            color: '#64748b', size: 'xs', weight: 'bold', margin: 'xl', wrap: true
          },
          {
            type: 'text',
            text: '即日起您將不再收到該成員的課程與學費推播。',
            color: '#94a3b8', size: 'xs', weight: 'bold', margin: 'md', wrap: true
          }
        ]
      }
    }
  }
}

// ── 歡迎訊息（加入好友時發送）──
export function welcomeMessage(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: '歡迎加入音樂補習班！',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '🎵 歡迎加入', color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '請點擊下方按鈕完成帳號綁定，即可收到專屬課程通知與學費提醒！',
            color: '#334155', size: 'sm', weight: 'bold', wrap: true
          },
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: '綁定步驟', color: '#94a3b8', size: 'xs', weight: 'bold', margin: 'xl' },
          createTextList(['1️⃣ 點擊選單「綁定帳號」', '2️⃣ 輸入報名手機號碼', '3️⃣ 選擇要綁定的學生', '4️⃣ 開始接收通知'])
        ]
      }
    }
  }
}

// ── 綁定引導（按鈕開啟 LIFF）──
export function bindGuideMessage(liffId: string, path = '/liff/bind'): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: '請點擊按鈕進行帳號綁定',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '🔗 帳號綁定', color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '請點擊下方按鈕，依照步驟完成帳號綁定。', color: '#64748b', size: 'sm', weight: 'bold', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        backgroundColor: '#ffffff',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#66CCCC',
            height: 'sm',
            action: { type: 'uri', label: '開始綁定', uri: `https://liff.line.me/${liffId}${path}` }
          }
        ]
      }
    }
  }
}

// ── LIFF 頁面引導（通用）──
export function liffGuideMessage(params: {
  liffId: string; path: string; title: string; icon: string; description: string; buttonLabel: string; color?: string
}): messagingApi.FlexMessage {
  const { liffId, path, title, icon, description, buttonLabel, color = '#FFDF6F' } = params
  const textColor = color === '#FFDF6F' ? '#F56E4A' : '#ffffff'
  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: `${icon} ${title}`, color: textColor, size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: description, color: '#64748b', size: 'sm', weight: 'bold', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        backgroundColor: '#ffffff',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#FF9966',
            height: 'sm',
            action: { type: 'uri', label: buttonLabel, uri: `https://liff.line.me/${liffId}${path}` }
          }
        ]
      }
    }
  }
}

// ── 綁定狀態查詢（已綁定）──
export function bindStatusMessage(users: Array<{ name: string; role: string }>): messagingApi.FlexMessage {
  const roleLabel = (r: string) => r === 'teacher' ? '👨‍🏫 教師' : r === 'family' ? '👨‍👩‍👧 家長' : '管理員'
  const rows = users.map(u => createRow(roleLabel(u.role), u.name))
  return {
    type: 'flex',
    altText: '帳號綁定狀態',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '📋 綁定狀態', color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '已綁定帳號', color: '#94a3b8', size: 'xs', weight: 'bold' },
          ...rows,
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: '如需解除綁定，請至選單操作。', color: '#94a3b8', size: 'xs', weight: 'bold', margin: 'xl', wrap: true }
        ]
      }
    }
  }
}

// ── 綁定狀態查詢（未綁定）──
export function notBoundMessage(): messagingApi.FlexMessage {
  const liffId = process.env.LIFF_ID
  const footer = liffId ? {
    type: 'box' as const, layout: 'vertical' as const, paddingAll: '20px', backgroundColor: '#ffffff',
    contents: [
      {
        type: 'button' as const, style: 'primary' as const, color: '#66CCCC', height: 'sm' as const,
        action: { type: 'uri' as const, label: '立即綁定', uri: `https://liff.line.me/${liffId}/liff/bind` }
      }
    ]
  } : undefined

  return {
    type: 'flex',
    altText: '您尚未綁定帳號',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '📋 尚未綁定帳號', color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '您尚未綁定任何帳號，綁定後即可收到專屬通知。', color: '#64748b', size: 'sm', weight: 'bold', wrap: true }
        ]
      },
      ...(footer ? { footer } : {})
    }
  }
}

// ── 請假結果通知 ──
export function leaveResultMessage(params: {
  studentName: string; courseName: string; date: string; result: 'approved' | 'approved_makeup' | 'rejected'
  reason?: string; makeupInfo?: { date: string; room: string; teacher: string }
}): messagingApi.FlexMessage {
  const { studentName, courseName, date, result, reason, makeupInfo } = params
  
  const isApproved = result.startsWith('approved')
  const headerBg = isApproved ? '#66CCCC' : '#ef4444'
  const resultText = result === 'approved' ? '已核准 (不補課)' : result === 'approved_makeup' ? '已核准 (安排補課)' : '未通過'

  const bodyContents: messagingApi.FlexComponent[] = [
    createRow('學生', studentName),
    createRow('課程', courseName),
    createRow('日期', formatChineseDate(date)),
    createRow('結果', resultText, isApproved ? '#16a34a' : '#ef4444')
  ]

  if (reason && result === 'rejected') {
    bodyContents.push(createRow('原因', reason, '#ef4444'))
  }

  if (makeupInfo && result === 'approved_makeup') {
    bodyContents.push(
      { type: 'separator', margin: 'xl', color: '#f1f5f9' },
      { type: 'text', text: '補課安排', color: '#94a3b8', size: 'xs', weight: 'bold', margin: 'xl' },
      createRow('日期', formatChineseDate(makeupInfo.date)),
      createRow('教室', makeupInfo.room),
      createRow('老師', makeupInfo.teacher)
    )
  }

  return {
    type: 'flex',
    altText: `【${studentName}】請假處理通知`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerBg,
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: isApproved ? '✅ 請假已核准' : '❌ 請假未通過', color: '#ffffff', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: bodyContents
      }
    }
  }
}

// ── 點數獲得通知 ──
export function pointsEarnedMessage(params: {
  studentName: string; amount: number; reason: string; balance?: number; teacherName?: string
}): messagingApi.FlexMessage {
  const { studentName, amount, reason, balance, teacherName = '老師' } = params
  
  const bodyContents: messagingApi.FlexComponent[] = [
    { type: 'text', text: `+${amount}`, weight: 'bold', size: '5xl', color: '#FF9966', align: 'center' },
    { type: 'text', text: '點', size: 'md', color: '#FFDF6F', align: 'center', weight: 'bold', margin: 'sm' },
    { type: 'separator', margin: 'xl', color: '#f1f5f9' },
    {
      type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
      contents: [
        createRow('學生', studentName),
        createRow('原因', reason),
        createRow('發放', teacherName)
      ]
    }
  ]

  if (balance !== undefined) {
    bodyContents.push(createRow('目前累計', `${balance} 點`, '#F56E4A'))
  }

  return {
    type: 'flex',
    altText: `【${studentName}】獲得 ${amount} 點獎勵！`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF9966',
        paddingTop: '16px',
        paddingBottom: '16px',
        contents: [
          { type: 'text', text: '✨ 點數獎勵通知', color: '#ffffff', size: 'sm', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        backgroundColor: '#ffffff',
        contents: [
          createButton('查看點數存摺', `https://liff.line.me/${process.env.LIFF_ID}/liff/points`, '#FF9966')
        ]
      }
    }
  }
}

// ── 通用文字推播（附學生姓名）──
export function generalNotifyMessage(studentName: string, title: string, body: string): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `【${studentName}】${title}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFDF6F',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: `📢 ${title}`, color: '#F56E4A', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          createRow('對象', studentName),
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: body, size: 'sm', color: '#334155', wrap: true, margin: 'xl', weight: 'bold' }
        ]
      }
    }
  }
}

// ── 學費繳費提醒 ──
export function tuitionReminderMessage(params: {
  studentName: string; amount?: number; dueDate?: string; note?: string
}): messagingApi.FlexMessage {
  const { studentName, amount, dueDate, note } = params
  const rows: messagingApi.FlexComponent[] = [createRow('學生', studentName)]
  if (amount !== undefined) rows.push(createRow('應繳金額', `NT$ ${amount.toLocaleString()}`, '#F56E4A'))
  if (dueDate) rows.push(createRow('繳費期限', formatChineseDate(dueDate), '#ef4444'))

  return {
    type: 'flex',
    altText: `【${studentName}】學費繳費提醒`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#F56E4A',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '💰 學費繳款單', color: '#ffffff', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          ...rows,
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: note ?? '請於期限前完成繳費，謝謝！', size: 'xs', color: '#94a3b8', wrap: true, margin: 'xl', weight: 'bold' }
        ]
      }
    }
  }
}

// ── 學費收訖通知 ──
export function tuitionReceivedMessage(params: {
  studentName: string; amount?: number; paidDate?: string; note?: string
}): messagingApi.FlexMessage {
  const { studentName, amount, paidDate, note } = params
  const rows: messagingApi.FlexComponent[] = [createRow('學生', studentName)]
  if (amount !== undefined) rows.push(createRow('收款金額', `NT$ ${amount.toLocaleString()}`, '#16a34a'))
  if (paidDate) rows.push(createRow('繳款日期', formatChineseDate(paidDate)))

  return {
    type: 'flex',
    altText: `【${studentName}】學費已收訖`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16a34a',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '✅ 收款成功', color: '#ffffff', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          ...rows,
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: note ?? '感謝您的繳款！', size: 'xs', color: '#94a3b8', wrap: true, margin: 'xl', weight: 'bold' }
        ]
      }
    }
  }
}

// ── 課程異動通知 ──
export function courseChangeMessage(params: {
  studentName: string; courseName?: string; changeType?: string; originalDate?: string; newDate?: string; note?: string
}): messagingApi.FlexMessage {
  const { studentName, courseName, changeType, originalDate, newDate, note } = params
  const rows: messagingApi.FlexComponent[] = [createRow('學生', studentName)]
  if (courseName) rows.push(createRow('課程', courseName))
  if (changeType) rows.push(createRow('異動類型', changeType, '#66CCCC'))
  if (originalDate) rows.push(createRow('原定時間', formatChineseDate(originalDate)))
  if (newDate) rows.push(createRow('更新時間', formatChineseDate(newDate), '#66CCCC'))

  return {
    type: 'flex',
    altText: `【${studentName}】課程異動通知`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#66CCCC',
        paddingTop: '20px',
        paddingBottom: '20px',
        contents: [
          { type: 'text', text: '📅 課程異動', color: '#ffffff', size: 'lg', weight: 'bold', align: 'center' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          ...rows,
          { type: 'separator', margin: 'xl', color: '#f1f5f9' },
          { type: 'text', text: note ?? '請留意最新上課時間。', size: 'xs', color: '#94a3b8', wrap: true, margin: 'xl', weight: 'bold' }
        ]
      }
    }
  }
}
