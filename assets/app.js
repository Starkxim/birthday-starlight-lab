const DAY_MS = 86_400_000;
const JULIAN_YEAR_DAYS = 365.25;
const YEAR_MS = DAY_MS * JULIAN_YEAR_DAYS;
const SYNODIC_MONTH_DAYS = 29.53058867;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const DEFAULT_LOCATION = {
  name: "未命名观测点",
  lat: 0,
  lon: 0,
  light: "未估算光污染，请结合本地光害地图确认。",
};

const EQUIPMENT = {
  naked: {
    label: "肉眼暗空",
    maxMag: 5.5,
    easyMag: 4.8,
    minAlt: 35,
    price: "0 元，但需要真正暗的天空",
    skill: "入门，重点是暗适应和辨认星座",
    note: "适合在 Bortle 1-3 暗空下尝试。城市里肉眼极限会显著变差，接近 G5 的目标并不稳。",
  },
  binoculars: {
    label: "双筒望远镜",
    maxMag: 8.0,
    easyMag: 6.8,
    minAlt: 30,
    price: "约 300-1500 元",
    skill: "入门到轻度练习，需要会按星图跳星",
    note: "7x50 或 10x50 双筒可以覆盖较宽视场，适合先用亮星定位，再确认较暗目标。",
  },
  camera_fixed: {
    label: "相机固定三脚架",
    maxMag: 8.5,
    easyMag: 7.2,
    minAlt: 28,
    price: "已有相机时成本较低",
    skill: "需要会手动曝光、对焦和多张堆栈",
    note: "使用广角到中焦短曝光，拍多张后堆栈。长焦固定三脚架会受地球自转拖线限制。",
  },
  telephoto_tracker: {
    label: "长焦加星野赤道仪",
    maxMag: 11.0,
    easyMag: 8.8,
    minAlt: 25,
    price: "约 3000-15000 元，取决于镜头和赤道仪",
    skill: "中等，需要极轴、构图和堆栈处理",
    note: "200-600mm 镜头加轻量赤道仪是长焦恒星拍摄的甜点位，时间候选可以放暗一些。",
  },
  small_scope: {
    label: "小望远镜深空入门",
    maxMag: 13.5,
    easyMag: 10.2,
    minAlt: 23,
    price: "约 8000-30000 元",
    skill: "进阶，需要 GoTo、导星或短曝光堆栈",
    note: "允许更暗但时间更准的恒星。建议先在 Stellarium 或 Aladin 里确认视场和邻近亮星。",
  },
  advanced: {
    label: "进阶民用设备",
    maxMag: 14.0,
    easyMag: 11.0,
    minAlt: 22,
    price: "约 30000 元以上，仍属于民用设备范围",
    skill: "进阶，需要稳定跟踪、校准帧和后期经验",
    note: "接近当前星表亮度下限。真正瓶颈通常是透明度、月光、跟踪精度和后期信噪比。",
  },
};

const STAR_COLORS = {
  "blue-white": "#6e8fbe",
  white: "#f2f4f0",
  "yellow-white": "#e3c46f",
  orange: "#bd7a45",
  red: "#a65445",
  unknown: "#dfe5dc",
};

const I18N = {
  zh: {
    meta: {
      title: "Birthday Starlight",
      description: "寻找未来某个生日夜晚，当年从恒星出发的光抵达地球。",
    },
    header: {
      kicker: "Gaia DR3 近邻恒星",
      subtitle: "输入出生时刻和观测地点，寻找那束从恒星出发、在未来生日附近抵达地球的光。",
      languageToggle: "切换语言",
      languageLabel: "语言",
      themeToggle: "切换页面样式",
      themeLabel: "样式",
    },
    steps: {
      aria: "流程进度",
      inputTitle: "选择参数",
      inputHint: "生日、地点和设备",
      yearsTitle: "选择年份",
      yearsHint: "找一个生日夜晚",
      targetTitle: "查看星星",
      targetHint: "位置和拍摄建议",
    },
    form: {
      eyebrow: "Observation brief",
      title: "生日与观测条件",
      lead: "先告诉我你出生的那一刻，以及你准备在哪里看这束光。",
      birthDate: "出生日期",
      birthTime: "出生时间",
      birthTimeZone: "出生地时区",
      observerTimeZone: "观测地时区",
      placeSearch: "搜索观测地点",
      placePlaceholder: "例如: Tokyo, Mauna Kea, 北京",
      locate: "定位",
      locating: "查找中",
      mapLabel: "选择观测地点的地图",
      mapNote: "点击地图或拖动标记选择观测点。页面不会自动读取你的定位；地名搜索使用 OpenStreetMap Nominatim。",
      mapUnavailable: "地图资源没有载入。你仍然可以手动输入纬度和经度。",
      latitude: "纬度",
      longitude: "经度",
      equipment: "设备档位",
      horizon: "未来年份数",
      generate: "生成生日星光",
      share: "复制分享链接",
    },
    equipment: {
      naked: {
        label: "肉眼暗空",
        short: "低成本，难点是找暗场和避开月光。",
        price: "0 元，但需要真正暗的天空",
        skill: "入门，重点是暗适应和辨认星座",
        note: "适合在 Bortle 1-3 暗空下尝试。城市里肉眼极限会显著变差，接近 G5 的目标并不稳。",
      },
      binoculars: {
        label: "双筒望远镜",
        short: "入门友好，适合 7x50 或 10x50。",
        price: "约 300-1500 元",
        skill: "入门到轻度练习，需要会按星图跳星",
        note: "7x50 或 10x50 双筒可以覆盖较宽视场，适合先用亮星定位，再确认较暗目标。",
      },
      camera_fixed: {
        label: "相机固定三脚架",
        short: "短曝光多张堆栈，适合宽一点的视场。",
        price: "已有相机时成本较低",
        skill: "需要会手动曝光、对焦和多张堆栈",
        note: "使用广角到中焦短曝光，拍多张后堆栈。长焦固定三脚架会受地球自转拖线限制。",
      },
      telephoto_tracker: {
        label: "长焦加星野赤道仪",
        short: "200-600mm，极轴和堆栈开始重要。",
        price: "约 3000-15000 元，取决于镜头和赤道仪",
        skill: "中等，需要极轴、构图和堆栈处理",
        note: "200-600mm 镜头加轻量赤道仪是长焦恒星拍摄的甜点位，时间候选可以放暗一些。",
      },
      small_scope: {
        label: "小望远镜深空入门",
        short: "GoTo、导星或短曝光堆栈，时间可更准。",
        price: "约 8000-30000 元",
        skill: "进阶，需要 GoTo、导星或短曝光堆栈",
        note: "允许更暗但时间更准的恒星。建议先在 Stellarium 或 Aladin 里确认视场和邻近亮星。",
      },
      advanced: {
        label: "进阶民用设备",
        short: "更依赖天气、校准和后期，不需要专业台站。",
        price: "约 30000 元以上，仍属于民用设备范围",
        skill: "进阶，需要稳定跟踪、校准帧和后期经验",
        note: "接近当前星表亮度下限。真正瓶颈通常是透明度、月光、跟踪精度和后期信噪比。",
      },
    },
    nav: {
      backToInput: "返回修改参数",
      viewSelected: "查看选中的星星",
      backToYears: "返回选择年份",
      editInputs: "重新选择参数",
    },
    years: {
      eyebrow: "Year overview",
      title: "选择一个生日年份",
      lead: "每个方块代表那一年生日附近的一次候选观测机会。",
      waiting: "等待输入生日。",
      summary: "<strong>{count} 颗 Gaia DR3 恒星</strong>，约 {distance} 光年内，G≤{mag}。",
      location: "观测点：{name} ({lat}°, {lon}°)。{light}",
      equipment: "设备：{label}，候选上限 G≤{maxMag}，亮星优先 G≤{easyMag}。",
      noCandidate: "无候选",
      none: "无",
      precision: "最准 {value}",
      bright: "最亮 {value}",
    },
    target: {
      eyebrow: "Selected target",
      title: "你的生日星光",
      lead: "先看核心答案；需要科学细节时再展开。",
      empty: "生成后选择一个年份和候选星。",
      bestPhoto: "拍摄最稳",
      bestTiming: "时间最准",
      publicBadge: "大众结论",
      publicHeadline: "可以找这颗星：{star}",
      publicSubline: "先按这几条准备观测；需要精确数字时，再展开下面的科学细节。",
      publicIntro: "{date} 这个生日夜，可以试着寻找 {star}。",
      starCardTitle: "哪颗星",
      arrivalCardTitle: "这束光何时抵达",
      whereCardTitle: "在哪里看",
      shootCardTitle: "怎么拍",
      starCardBody: "{subtitle}",
      arrivalCardBody: "它大约在 {arrival} 抵达地球，和生日目标相差 {delta}。",
      whereCardBody: "最佳窗口约 {time}，看向 {azLabel} 方位，高度约 {alt}°。",
      shootCardBody: "按你选的设备档位：{equipment}。{note}",
      simpleNote: "正式拍摄前再用 Stellarium 或天文历核对构图、月光和天气。",
      details: "查看科学细节",
      metricArrival: "抵达时刻",
      metricBirthday: "生日目标",
      metricDelta: "时间偏差",
      metricDistance: "距离范围",
      metricBrightness: "亮度和颜色",
      metricWindow: "最佳窗口",
      metricIds: "交叉标识",
      metricDark: "暗夜可拍",
      metricMoon: "月相和月高",
      metricCoords: "坐标",
      metricDirection: "方位",
      distanceRange: "{min} 到 {max} 光年",
      brightnessColor: "G {mag}，{color}",
      windowValue: "{time}，高度 {alt}°",
      coordsValue: "RA {ra}°，Dec {dec}°",
      directionValue: "{label} {az}°",
      parallaxNote: "视差不确定性对应抵达范围：{start} 到 {end}。",
      findingNote: "找星时可在 Stellarium 或 Aladin 中输入 Gaia source_id：{id}，再核对相机视场。",
      ephemerisNote: "太阳和月亮位置为浏览器端近似星历，用于初筛月光和暮光；正式拍摄前请再用 Stellarium 或天文历核对。",
      skyWaiting: "等待目标",
      skyHorizon: "0° 地平线",
      skyAltAz: "高度 {alt}° · 方位 {az}°",
      calendar: "下载日历提醒",
    },
    tabs: {
      precision: "时间最准",
      bright: "拍摄最稳",
      unavailable: "暂无候选",
    },
    links: {
      simbad: "打开 SIMBAD",
      aladin: "打开 Aladin",
      gaia: "打开 Gaia Archive",
    },
    weather: {
      title: "目标夜天气",
      eyebrow: "Weather check",
      button: "查询目标夜天气",
      loading: "查询中",
      loadingText: "正在从 Open-Meteo 获取逐小时预报。",
      retry: "重新查询天气",
      unavailablePast: "这个最佳窗口已经不在未来预报范围内。请以实际观测前的天气为准。",
      unavailableFuture: "目标夜距离现在超过 16 天，天气预报还不可靠；临近拍摄前再查询。",
      available: "目标夜已进入 16 天预报窗口，可查询云量、降水概率、能见度和风。",
      fetchFailed: "天气查询失败：{message}。",
      noData: "预报数据为空",
      good: "条件较适合拍摄",
      mixed: "条件一般，需要临近复核",
      bad: "不推荐拍摄",
      summary: "{grade}。预报时间 {time}，距离最佳窗口约 {hours}。",
      cloud: "云量",
      precip: "降水概率",
      visibility: "能见度",
      wind: "风速/阵风",
      temp: "温度",
      humidity: "湿度",
      unknown: "未知",
      futureNote: "目标日期距离现在超过常规可靠天气预报窗口，多年后的云量只能临近拍摄前再确认。",
      nearNote: "目标日期已进入常规天气预报窗口，可在拍摄前再查云量、透明度、风和月相。",
    },
    status: {
      catalogLoading: "载入星表中",
      catalogFailed: "Catalog failed",
      catalogFailedBody: "无法读取 <code>data/star-catalog.json</code>。请通过本地服务器或 GitHub Pages 打开页面。",
      catalogLoaded: "{count} stars",
      catalogNames: "{count} names",
      defaultLocationName: "未命名观测点",
      defaultLight: "未估算光污染，请结合本地光害地图确认。",
      mapPick: "地图选点",
      shareCopied: "分享链接已复制。",
      shareUpdated: "链接已更新到地址栏，可以手动复制。",
      shareFailed: "无法生成分享链接。",
      noPlace: "没有找到这个地点，请换一个名称或手动输入坐标。",
      invalidBirthTz: "出生地时区无效，请使用类似 Asia/Shanghai 的 IANA 时区。",
      invalidObsTz: "观测地时区无效，请使用类似 Asia/Shanghai 的 IANA 时区。",
      invalidLat: "纬度必须在 -90 到 90 之间。",
      invalidLon: "经度必须在 -180 到 180 之间。",
      outOfCatalog: "星表覆盖约 {min} 到 {max} 光年；这个生日窗口需要 {target} 光年。",
      candidates: "{count} 个可见候选进入筛选",
      noVisibleCandidate: "没有找到满足高度和设备限制的候选",
    },
    observing: {
      moonText: "{phase}，照明约 {illumination}%",
      moonAbove: "，月亮高度 {alt}°",
      moonBelow: "，月亮在地平线下",
      noOverlap: "目标高度与天文夜无重叠",
      noTargetWindow: "目标没有高于 {minAlt}° 的窗口",
      noDark: "无天文夜，太阳最低 {sunAlt}°",
      summaryGood: "观测夜 {date}：天文夜 {dark}；目标高于 {minAlt}° 的窗口 {target}；暗夜内最佳约 {time}，目标高度 {targetAlt}°，太阳高度 {sunAlt}°。",
      summaryMixed: "观测夜 {date}：天文夜 {dark}；目标高于 {minAlt}° 的窗口 {target}；两者暂未重叠，可以改用相邻日期、降低最低高度或选择更亮候选。",
    },
    phase: {
      new: "新月",
      crescent: "蛾眉月",
      firstQuarter: "上弦前后",
      waxingGibbous: "盈凸月",
      full: "满月前后",
      waningGibbous: "亏凸月",
      lastQuarter: "下弦前后",
      balsamic: "残月",
    },
    color: {
      "blue-white": "蓝白色",
      white: "白色",
      "yellow-white": "黄白色",
      orange: "橙色",
      red: "红色",
      unknown: "颜色未知",
    },
    direction: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"],
    delta: {
      same: "几乎同刻",
      late: "晚",
      early: "早",
      hours: "{dir} {value} 小时",
      days: "{dir} {value} 天",
      months: "{dir} {value} 个月",
    },
    hours: {
      zero: "0 小时",
      late: "晚 {value} 小时",
      early: "早 {value} 小时",
    },
  },
  en: {
    meta: {
      title: "Birthday Starlight",
      description: "Find a future birthday night when light that left a nearby star around your birth moment reaches Earth.",
    },
    header: {
      kicker: "Gaia DR3 nearby stars",
      subtitle: "Enter a birth moment and observing place to find starlight that may arrive near a future birthday.",
      languageToggle: "Change language",
      languageLabel: "Language",
      themeToggle: "Change visual style",
      themeLabel: "Style",
    },
    steps: {
      aria: "Progress",
      inputTitle: "Set up",
      inputHint: "Birth, place, equipment",
      yearsTitle: "Pick a year",
      yearsHint: "Choose a birthday night",
      targetTitle: "Meet the star",
      targetHint: "Where and how to shoot",
    },
    form: {
      eyebrow: "Observation brief",
      title: "Birth and observing setup",
      lead: "Start with the moment you were born and the place you plan to observe from.",
      birthDate: "Birth date",
      birthTime: "Birth time",
      birthTimeZone: "Birth time zone",
      observerTimeZone: "Observer time zone",
      placeSearch: "Search observing place",
      placePlaceholder: "Example: Tokyo, Mauna Kea, Beijing",
      locate: "Locate",
      locating: "Searching",
      mapLabel: "Map for choosing an observing location",
      mapNote: "Click the map or drag the marker to choose a site. The page never reads your device location automatically. Place search uses OpenStreetMap Nominatim.",
      mapUnavailable: "Map assets did not load. You can still enter latitude and longitude manually.",
      latitude: "Latitude",
      longitude: "Longitude",
      equipment: "Equipment level",
      horizon: "Future years",
      generate: "Find my starlight",
      share: "Copy share link",
    },
    equipment: {
      naked: {
        label: "Naked eye, dark sky",
        short: "Lowest cost. The hard part is finding dark sky and avoiding moonlight.",
        price: "No extra gear, but truly dark sky is needed",
        skill: "Beginner. Dark adaptation and constellation recognition matter.",
        note: "Best in Bortle 1-3 skies. City skies make near-G5 targets much less reliable.",
      },
      binoculars: {
        label: "Binoculars",
        short: "Beginner friendly. Good for 7x50 or 10x50 binoculars.",
        price: "Roughly 300-1500 CNY",
        skill: "Beginner to light practice. You will need basic star-hopping.",
        note: "7x50 or 10x50 binoculars give a wide field. Start from brighter stars, then confirm the fainter target.",
      },
      camera_fixed: {
        label: "Camera on fixed tripod",
        short: "Short exposures and stacking. Better with a wider field.",
        price: "Low cost if you already own a camera",
        skill: "Manual exposure, manual focus, and stacking are needed.",
        note: "Use wide to medium lenses and stack many short exposures. Long lenses on a fixed tripod are limited by star trails.",
      },
      telephoto_tracker: {
        label: "Telephoto with star tracker",
        short: "200-600mm. Polar alignment and stacking start to matter.",
        price: "Roughly 3000-15000 CNY depending on lens and tracker",
        skill: "Intermediate. Polar alignment, framing, and stacking matter.",
        note: "A 200-600mm lens on a light tracker is the sweet spot for telephoto star imaging.",
      },
      small_scope: {
        label: "Small telescope setup",
        short: "GoTo, guiding, or stacked short exposures. Timing can be tighter.",
        price: "Roughly 8000-30000 CNY",
        skill: "Advanced beginner. GoTo, guiding, or careful short-exposure stacking helps.",
        note: "Allows fainter but better-timed stars. Confirm field of view and nearby guide stars in Stellarium or Aladin.",
      },
      advanced: {
        label: "Advanced civilian setup",
        short: "More dependent on weather, calibration, and processing. No professional observatory required.",
        price: "Roughly 30000 CNY and above",
        skill: "Advanced. Stable tracking, calibration frames, and processing experience matter.",
        note: "Near the current catalog limit. The real bottlenecks are transparency, moonlight, tracking, and post-processing signal-to-noise.",
      },
    },
    nav: {
      backToInput: "Back to setup",
      viewSelected: "View selected star",
      backToYears: "Back to years",
      editInputs: "Edit setup",
    },
    years: {
      eyebrow: "Year overview",
      title: "Choose a birthday year",
      lead: "Each tile is one possible observing night near that birthday.",
      waiting: "Waiting for your birth details.",
      summary: "<strong>{count} Gaia DR3 stars</strong>, within about {distance} light-years, G≤{mag}.",
      location: "Observing site: {name} ({lat}°, {lon}°). {light}",
      equipment: "Equipment: {label}. Candidate limit G≤{maxMag}; easier target priority G≤{easyMag}.",
      noCandidate: "No candidate",
      none: "None",
      precision: "Closest {value}",
      bright: "Brightest {value}",
    },
    target: {
      eyebrow: "Selected target",
      title: "Your birthday starlight",
      lead: "Start with the plain-language answer. Open the science details if you want the full numbers.",
      empty: "Generate results, then choose a year and a candidate star.",
      bestPhoto: "Easiest to image",
      bestTiming: "Closest timing",
      publicBadge: "Plain answer",
      publicHeadline: "Try this star: {star}",
      publicSubline: "Start with these observing notes. Open the science details below when you want the exact numbers.",
      publicIntro: "On the birthday night of {date}, try looking for {star}.",
      starCardTitle: "Which star",
      arrivalCardTitle: "When the light arrives",
      whereCardTitle: "Where to look",
      shootCardTitle: "How to shoot it",
      starCardBody: "{subtitle}",
      arrivalCardBody: "The light is estimated to reach Earth around {arrival}, offset from the birthday target by {delta}.",
      whereCardBody: "Best window around {time}. Look {azLabel}, about {alt}° above the horizon.",
      shootCardBody: "For your selected gear: {equipment}. {note}",
      simpleNote: "Before a real shoot, confirm framing, moonlight, and weather in Stellarium or an astronomy almanac.",
      details: "Show science details",
      metricArrival: "Arrival time",
      metricBirthday: "Birthday target",
      metricDelta: "Timing offset",
      metricDistance: "Distance range",
      metricBrightness: "Brightness and color",
      metricWindow: "Best window",
      metricIds: "Cross IDs",
      metricDark: "Dark-sky window",
      metricMoon: "Moon phase and height",
      metricCoords: "Coordinates",
      metricDirection: "Direction",
      distanceRange: "{min} to {max} light-years",
      brightnessColor: "G {mag}, {color}",
      windowValue: "{time}, altitude {alt}°",
      coordsValue: "RA {ra}°, Dec {dec}°",
      directionValue: "{label} {az}°",
      parallaxNote: "Parallax uncertainty gives this arrival range: {start} to {end}.",
      findingNote: "In Stellarium or Aladin, search Gaia source_id {id}, then confirm the camera field.",
      ephemerisNote: "Sun and Moon positions are browser-side approximations for first-pass twilight and moonlight checks. Recheck in Stellarium or an astronomy almanac before shooting.",
      skyWaiting: "Waiting for a target",
      skyHorizon: "0° horizon",
      skyAltAz: "Alt {alt}° · Az {az}°",
      calendar: "Download calendar reminder",
    },
    tabs: {
      precision: "Closest timing",
      bright: "Easiest to image",
      unavailable: "No candidate",
    },
    links: {
      simbad: "Open SIMBAD",
      aladin: "Open Aladin",
      gaia: "Open Gaia Archive",
    },
    weather: {
      title: "Target-night weather",
      eyebrow: "Weather check",
      button: "Check target-night weather",
      loading: "Checking",
      loadingText: "Fetching hourly forecast from Open-Meteo.",
      retry: "Check again",
      unavailablePast: "This observing window is no longer in the future forecast range. Use the actual conditions near observing time.",
      unavailableFuture: "The target night is more than 16 days away. Weather forecasts are not reliable yet. Check again near the shoot.",
      available: "The target night is inside the 16-day forecast window. You can check cloud cover, precipitation chance, visibility, and wind.",
      fetchFailed: "Weather check failed: {message}.",
      noData: "Forecast data is empty",
      good: "Good enough to try",
      mixed: "Mixed conditions, recheck near the night",
      bad: "Not recommended",
      summary: "{grade}. Forecast time {time}, about {hours} from the best window.",
      cloud: "Cloud",
      precip: "Precipitation",
      visibility: "Visibility",
      wind: "Wind/gusts",
      temp: "Temperature",
      humidity: "Humidity",
      unknown: "Unknown",
      futureNote: "The target date is outside the reliable forecast window. Cloud cover years in advance must be checked shortly before observing.",
      nearNote: "The target date is inside the normal forecast window. Recheck cloud cover, transparency, wind, and moonlight before shooting.",
    },
    status: {
      catalogLoading: "Loading catalog",
      catalogFailed: "Catalog failed",
      catalogFailedBody: "Could not read <code>data/star-catalog.json</code>. Open the app through a local server or GitHub Pages.",
      catalogLoaded: "{count} stars",
      catalogNames: "{count} names",
      defaultLocationName: "Unnamed observing site",
      defaultLight: "Light pollution is not estimated yet. Check a local light-pollution map.",
      mapPick: "Map point",
      shareCopied: "Share link copied.",
      shareUpdated: "The link is updated in the address bar. You can copy it manually.",
      shareFailed: "Could not create a share link.",
      noPlace: "No place found. Try another name or enter coordinates manually.",
      invalidBirthTz: "Birth time zone is invalid. Use an IANA time zone such as Asia/Shanghai.",
      invalidObsTz: "Observer time zone is invalid. Use an IANA time zone such as Asia/Shanghai.",
      invalidLat: "Latitude must be between -90 and 90.",
      invalidLon: "Longitude must be between -180 and 180.",
      outOfCatalog: "The catalog covers about {min} to {max} light-years. This birthday window needs {target} light-years.",
      candidates: "{count} visible candidates passed the filters",
      noVisibleCandidate: "No candidate met the altitude and equipment limits",
    },
    observing: {
      moonText: "{phase}, about {illumination}% illuminated",
      moonAbove: ", Moon altitude {alt}°",
      moonBelow: ", Moon below the horizon",
      noOverlap: "No overlap between target altitude and astronomical night",
      noTargetWindow: "Target never rises above {minAlt}°",
      noDark: "No astronomical night, lowest Sun altitude {sunAlt}°",
      summaryGood: "Observing night {date}: astronomical night {dark}; target above {minAlt}° during {target}; best dark-window time around {time}, target altitude {targetAlt}°, Sun altitude {sunAlt}°.",
      summaryMixed: "Observing night {date}: astronomical night {dark}; target above {minAlt}° during {target}; they do not overlap yet. Try a nearby date, lower minimum altitude, or choose a brighter candidate.",
    },
    phase: {
      new: "New Moon",
      crescent: "Crescent Moon",
      firstQuarter: "Near first quarter",
      waxingGibbous: "Waxing gibbous",
      full: "Near full Moon",
      waningGibbous: "Waning gibbous",
      lastQuarter: "Near last quarter",
      balsamic: "Old crescent Moon",
    },
    color: {
      "blue-white": "blue-white",
      white: "white",
      "yellow-white": "yellow-white",
      orange: "orange",
      red: "red",
      unknown: "unknown color",
    },
    direction: ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"],
    delta: {
      same: "almost exact",
      late: "late",
      early: "early",
      hours: "{value} hours {dir}",
      days: "{value} days {dir}",
      months: "{value} months {dir}",
    },
    hours: {
      zero: "0 hours",
      late: "{value} hours later",
      early: "{value} hours earlier",
    },
  },
};

const app = {
  catalog: null,
  crossIds: {},
  crossMeta: null,
  stars: [],
  results: [],
  selectedIndex: 0,
  selectedKind: "precision",
  step: "input",
  lang: "zh",
  hasSharedState: false,
  currentForm: null,
  map: null,
  marker: null,
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  initLanguage();
  initTheme();
  populateTimeZones();
  setDefaultForm();
  app.hasSharedState = applySharedState();
  bindControls();
  initMap();
  drawStarscape();
  setStep("input");
  applyLanguage();
  await loadCatalog();
  if (app.hasSharedState) {
    $("birthForm").dispatchEvent(new Event("submit", { cancelable: true }));
  } else {
    renderEmptyState();
  }
}

function initLanguage() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("lang") || localStorage.getItem("birthday-starlight-lang") || navigator.language;
  app.lang = String(requested).toLowerCase().startsWith("en") ? "en" : "zh";
}

function setLanguage(lang) {
  app.lang = lang === "en" ? "en" : "zh";
  localStorage.setItem("birthday-starlight-lang", app.lang);
  applyLanguage();
  updateLanguageUrl();
  if (app.catalog) updateCatalogStatus();
  if (app.currentForm && app.catalog) {
    app.currentForm = readForm();
    app.results = computeResults(app.currentForm);
  }
  if (app.results.length) {
    renderResults({ preserveStep: true });
  } else {
    renderEmptyState();
  }
  if (app.currentForm) updateShareUrl(app.currentForm);
}

function updateLanguageUrl() {
  const params = new URLSearchParams(window.location.search);
  params.set("lang", app.lang);
  window.history.replaceState(null, "", `${window.location.origin}${window.location.pathname}?${params.toString()}`);
}

function t(key, values = {}) {
  const text = getTranslation(app.lang, key) ?? getTranslation("zh", key) ?? key;
  if (Array.isArray(text)) return text;
  return String(text).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function getTranslation(lang, key) {
  return key.split(".").reduce((value, part) => value?.[part], I18N[lang]);
}

function applyLanguage() {
  document.documentElement.lang = app.lang === "en" ? "en" : "zh-CN";
  document.title = t("meta.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-lang-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.langChoice === app.lang));
  });
  if (!app.catalog && $("catalogStatus")) {
    $("catalogStatus").textContent = t("status.catalogLoading");
  }
}

function setStep(step) {
  const allowed = ["input", "years", "target"];
  app.step = allowed.includes(step) ? step : "input";
  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.stepPanel === app.step);
  });
  document.querySelectorAll("[data-step-target]").forEach((button) => {
    const target = button.dataset.stepTarget;
    const enabled =
      target === "input" ||
      (target === "years" && app.results.length > 0) ||
      (target === "target" && Boolean(currentRecord()));
    button.disabled = !enabled;
    button.classList.toggle("active", target === app.step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentRecord() {
  const result = app.results[app.selectedIndex];
  return result ? result[app.selectedKind] || result.precision || result.bright : null;
}

function equipmentText(equipment, field) {
  const key = equipmentKeyFor(equipment);
  return t(`equipment.${key}.${field}`);
}

function populateTimeZones() {
  const fallback = ["UTC", "Asia/Shanghai", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : fallback;
  $("timeZoneOptions").innerHTML = zones.map((zone) => `<option value="${escapeHTML(zone)}"></option>`).join("");
}

function setDefaultForm() {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  $("birthDate").value = "1990-01-01";
  $("birthTime").value = "12:00";
  $("birthTimeZone").value = browserZone;
  $("observerTimeZone").value = browserZone;
  $("latitude").value = DEFAULT_LOCATION.lat.toFixed(4);
  $("longitude").value = DEFAULT_LOCATION.lon.toFixed(4);
}

function bindControls() {
  document.querySelectorAll("[data-lang-choice]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.langChoice));
  });

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });

  document.querySelectorAll("[data-step-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.disabled) setStep(button.dataset.stepTarget);
    });
  });

  $("birthForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!app.catalog) return;

    try {
      const form = readForm();
      app.currentForm = form;
      app.results = computeResults(form);
      app.selectedIndex = 0;
      app.selectedKind = "precision";
      updateShareUrl(form);
      renderResults();
      setStep("years");
    } catch (error) {
      $("summary").innerHTML = `<span class="warning">${escapeHTML(error.message)}</span>`;
      console.error(error);
    }
  });

  $("latitude").addEventListener("change", syncMarkerFromFields);
  $("longitude").addEventListener("change", syncMarkerFromFields);
  $("shareButton").addEventListener("click", copyShareLink);
  $("backToInput").addEventListener("click", () => setStep("input"));
  $("goToTarget").addEventListener("click", () => setStep("target"));
  $("backToYears").addEventListener("click", () => setStep("years"));
  $("editInputs").addEventListener("click", () => setStep("input"));
  $("placeSearchButton").addEventListener("click", searchPlace);
  $("placeSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlace();
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem("birthday-starlight-theme");
  setTheme(saved === "fieldbook" ? "fieldbook" : "mission");
}

function setTheme(theme) {
  const nextTheme = theme === "fieldbook" ? "fieldbook" : "mission";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("birthday-starlight-theme", nextTheme);
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === nextTheme));
  });
}

function initMap() {
  if (!window.L || !$("map")) {
    $("map").textContent = t("form.mapUnavailable");
    return;
  }

  const fieldLat = Number($("latitude").value);
  const fieldLon = Number($("longitude").value);
  const startLat = clamp(Number.isFinite(fieldLat) ? fieldLat : DEFAULT_LOCATION.lat, -90, 90);
  const startLon = clamp(Number.isFinite(fieldLon) ? fieldLon : DEFAULT_LOCATION.lon, -180, 180);
  app.map = L.map("map", {
    zoomControl: true,
    attributionControl: true,
  }).setView([startLat, startLon], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(app.map);

  app.marker = L.marker([startLat, startLon], { draggable: true }).addTo(app.map);
  app.marker.on("dragend", () => {
    const pos = app.marker.getLatLng();
    setLocation(pos.lat, pos.lng, t("status.mapPick"));
  });
  app.map.on("click", (event) => setLocation(event.latlng.lat, event.latlng.lng, t("status.mapPick")));
}

function applySharedState() {
  const params = new URLSearchParams(window.location.search);
  const sharedKeys = ["birth", "time", "birthTz", "obsTz", "lat", "lon", "years", "place", "equipment", "equip"];
  const hasSharedState = sharedKeys.some((key) => params.has(key));
  if (!hasSharedState) return false;

  setInputFromParam(params, "birthDate", "birth");
  setInputFromParam(params, "birthTime", "time");
  setInputFromParam(params, "birthTimeZone", "birthTz");
  setInputFromParam(params, "observerTimeZone", "obsTz");
  setInputFromParam(params, "latitude", "lat");
  setInputFromParam(params, "longitude", "lon");
  setInputFromParam(params, "horizon", "years");
  setInputFromParam(params, "placeSearch", "place");

  const equipmentKey = params.get("equipment") || params.get("equip");
  if (equipmentKey && EQUIPMENT[equipmentKey]) {
    const option = document.querySelector(`input[name="equipment"][value="${equipmentKey}"]`);
    if (option) option.checked = true;
  }
  return true;
}

function setInputFromParam(params, inputId, paramName) {
  const value = params.get(paramName);
  if (value !== null && value !== "") $(inputId).value = value;
}

async function copyShareLink() {
  try {
    const form = app.currentForm || readForm();
    const url = updateShareUrl(form);
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url);
    setShareStatus(t("status.shareCopied"));
  } catch (error) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError" || error.message === "Clipboard unavailable") {
      const form = app.currentForm || readForm();
      updateShareUrl(form);
      setShareStatus(t("status.shareUpdated"));
      return;
    }
    setShareStatus(error.message || t("status.shareFailed"), true);
  }
}

function updateShareUrl(form) {
  const url = buildShareUrl(form);
  window.history.replaceState(null, "", url);
  return url;
}

function buildShareUrl(form) {
  const params = new URLSearchParams();
  params.set("lang", app.lang);
  params.set("birth", `${form.birthYear}-${pad2(form.birthMonth)}-${pad2(form.birthDay)}`);
  params.set("time", `${pad2(form.birthHour)}:${pad2(form.birthMinute)}`);
  params.set("birthTz", form.birthTimeZone);
  params.set("obsTz", form.observerTimeZone);
  params.set("lat", form.location.lat.toFixed(4));
  params.set("lon", form.location.lon.toFixed(4));
  params.set("equipment", equipmentKeyFor(form.equipment));
  params.set("years", String(form.horizon));
  const placeValue = $("placeSearch").value.trim();
  if (placeValue) {
    params.set("place", placeValue);
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function equipmentKeyFor(equipment) {
  return Object.entries(EQUIPMENT).find(([, value]) => value === equipment)?.[0] || "naked";
}

function setShareStatus(message, isWarning = false) {
  const target = $("shareStatus");
  target.textContent = message;
  target.classList.toggle("warning", isWarning);
}

function setLocation(lat, lon, name) {
  $("latitude").value = Number(lat).toFixed(4);
  $("longitude").value = Number(lon).toFixed(4);
  $("placeSearch").value = name || "";
  if (app.marker) app.marker.setLatLng([lat, lon]);
  if (app.map) app.map.panTo([lat, lon], { animate: true });
}

function syncMarkerFromFields() {
  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (app.marker) app.marker.setLatLng([lat, lon]);
  if (app.map) app.map.panTo([lat, lon], { animate: true });
}

async function searchPlace() {
  const query = $("placeSearch").value.trim();
  if (!query) return;

  $("placeSearchButton").disabled = true;
  $("placeSearchButton").textContent = t("form.locating");
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const results = await response.json();
    if (!results.length) throw new Error(t("status.noPlace"));
    const place = results[0];
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    setLocation(lat, lon, place.display_name);
    if (app.map) app.map.setView([lat, lon], 9);
  } catch (error) {
    $("summary").innerHTML = `<span class="warning">${escapeHTML(error.message)}</span>`;
  } finally {
    $("placeSearchButton").disabled = false;
    $("placeSearchButton").textContent = t("form.locate");
  }
}

async function loadCatalog() {
  const status = $("catalogStatus");
  try {
    const response = await fetch("data/star-catalog.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    app.catalog = await response.json();
    app.stars = app.catalog.stars || [];
    await loadCrossIdentifications();
    updateCatalogStatus();
  } catch (error) {
    status.textContent = t("status.catalogFailed");
    $("summary").innerHTML = t("status.catalogFailedBody");
    console.error(error);
  }
}

function updateCatalogStatus() {
  const status = $("catalogStatus");
  const meta = app.catalog?.meta || {};
  const aliasCount = app.crossMeta?.matchedCount || Object.keys(app.crossIds).length;
  const catalogText = t("status.catalogLoaded", { count: (meta.count || app.stars.length).toLocaleString() });
  const aliasText = aliasCount ? ` · ${t("status.catalogNames", { count: aliasCount.toLocaleString() })}` : "";
  status.textContent = catalogText + aliasText;
}

async function loadCrossIdentifications() {
  try {
    const response = await fetch("data/star-crossids.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    app.crossIds = payload.aliases || {};
    app.crossMeta = payload.meta || null;
  } catch (error) {
    app.crossIds = {};
    app.crossMeta = null;
    console.info("Optional star cross-identifications unavailable.", error);
  }
}

function readForm() {
  const [birthYear, birthMonth, birthDay] = $("birthDate").value.split("-").map(Number);
  const [birthHour, birthMinute] = ($("birthTime").value || "12:00").split(":").map(Number);
  const birthTimeZone = $("birthTimeZone").value.trim();
  const observerTimeZone = $("observerTimeZone").value.trim();
  if (!isValidTimeZone(birthTimeZone)) throw new Error(t("status.invalidBirthTz"));
  if (!isValidTimeZone(observerTimeZone)) throw new Error(t("status.invalidObsTz"));

  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error(t("status.invalidLat"));
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error(t("status.invalidLon"));

  const equipmentKey = document.querySelector('input[name="equipment"]:checked')?.value || "naked";
  const equipment = EQUIPMENT[equipmentKey] || EQUIPMENT.naked;
  const horizon = clamp(Number($("horizon").value) || 20, 5, 50);
  const birthMs = zonedDateMs(birthYear, birthMonth, birthDay, birthHour, birthMinute, birthTimeZone);
  const placeName = $("placeSearch").value.trim() || t("status.defaultLocationName");

  return {
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    birthTimeZone,
    observerTimeZone,
    birthMs,
    location: {
      name: placeName,
      lat,
      lon,
      light: t("status.defaultLight"),
    },
    equipment,
    horizon,
  };
}

function computeResults(form) {
  const startYear = nextBirthdayYear(form);
  const years = [];
  for (let year = startYear; year < startYear + form.horizon; year += 1) {
    const anniversary = anniversaryParts(year, form.birthMonth, form.birthDay);
    const targetMs = zonedDateMs(
      year,
      anniversary.month,
      anniversary.day,
      form.birthHour,
      form.birthMinute,
      form.birthTimeZone,
    );
    const targetAgeYears = (targetMs - form.birthMs) / YEAR_MS;
    years.push(computeYear(form, year, anniversary, targetMs, targetAgeYears));
  }
  return years;
}

function computeYear(form, year, anniversary, targetMs, targetAgeYears) {
  const minDistance = app.stars[0]?.distanceLy ?? 0;
  const maxDistance = app.stars[app.stars.length - 1]?.distanceLy ?? 0;
  if (targetAgeYears < minDistance || targetAgeYears > maxDistance) {
    return {
      year,
      anniversary,
      targetMs,
      targetAgeYears,
      precision: null,
      bright: null,
      status: t("status.outOfCatalog", {
        min: minDistance.toFixed(1),
        max: maxDistance.toFixed(0),
        target: targetAgeYears.toFixed(1),
      }),
    };
  }

  const seen = new Set();
  const records = [];
  const spans = [0.03, 0.08, 0.18, 0.4, 0.8, 1.6, 3.2, 6.4, 12, 24];

  for (const span of spans) {
    const nearby = starsInDistanceRange(targetAgeYears, span);
    for (const star of nearby) {
      if (seen.has(star.id)) continue;
      seen.add(star.id);
      if (star.gMag > form.equipment.maxMag) continue;
      const visibility = bestVisibility(star, form, anniversary);
      if (!visibility || visibility.alt < form.equipment.minAlt) continue;
      records.push(candidateRecord(star, form, year, targetMs, targetAgeYears, visibility));
    }

    if (selectPrecision(records, form) && selectBright(records, form)) break;
  }

  const precision = selectPrecision(records, form);
  const bright = selectBright(records, form);
  return {
    year,
    anniversary,
    targetMs,
    targetAgeYears,
    precision,
    bright,
    status: records.length ? t("status.candidates", { count: records.length }) : t("status.noVisibleCandidate"),
  };
}

function candidateRecord(star, form, year, targetMs, targetAgeYears, visibility) {
  const arrivalMs = form.birthMs + star.distanceLy * YEAR_MS;
  const arrivalMinMs = form.birthMs + star.distanceMinLy * YEAR_MS;
  const arrivalMaxMs = form.birthMs + star.distanceMaxLy * YEAR_MS;
  const deltaDays = (arrivalMs - targetMs) / DAY_MS;
  return {
    star,
    year,
    targetMs,
    targetAgeYears,
    arrivalMs,
    arrivalMinMs,
    arrivalMaxMs,
    deltaDays,
    absDeltaDays: Math.abs(deltaDays),
    visibility,
  };
}

function selectPrecision(records, form) {
  return records
    .filter((record) => record.star.gMag <= form.equipment.maxMag)
    .slice()
    .sort((a, b) => a.absDeltaDays - b.absDeltaDays || a.star.gMag - b.star.gMag)[0] || null;
}

function selectBright(records, form) {
  const easyPool = records.filter((record) => record.star.gMag <= form.equipment.easyMag);
  const pool = easyPool.length ? easyPool : records;
  return pool
    .slice()
    .sort((a, b) => brightScore(a, form) - brightScore(b, form))[0] || null;
}

function brightScore(record, form) {
  const timePenalty = Math.min(record.absDeltaDays, 900);
  const altitudeBonus = Math.max(0, record.visibility.alt - form.equipment.minAlt) * 2;
  return record.star.gMag * 85 + timePenalty - altitudeBonus;
}

function starsInDistanceRange(targetLy, spanLy) {
  const start = lowerBoundDistance(targetLy - spanLy);
  const end = upperBoundDistance(targetLy + spanLy);
  return app.stars.slice(start, end);
}

function lowerBoundDistance(value) {
  let lo = 0;
  let hi = app.stars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (app.stars[mid].distanceLy < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundDistance(value) {
  let lo = 0;
  let hi = app.stars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (app.stars[mid].distanceLy <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function bestVisibility(star, form, anniversary) {
  let best = null;
  for (const dayShift of [-1, 0]) {
    const baseMs = zonedDateMs(
      anniversary.year,
      anniversary.month,
      anniversary.day + dayShift,
      0,
      0,
      form.observerTimeZone,
    );
    for (let minutes = 19 * 60; minutes <= 28 * 60; minutes += 30) {
      const sampleMs = baseMs + minutes * 60_000;
      const altAz = horizontalCoords(star.ra, star.dec, sampleMs, form.location.lat, form.location.lon);
      if (!best || altAz.alt > best.alt) {
        best = {
          ...altAz,
          timeMs: sampleMs,
          nightShift: dayShift,
        };
      }
    }
  }
  return best;
}

function horizontalCoords(raDeg, decDeg, ms, latDeg, lonDeg) {
  const lat = latDeg * DEG;
  const dec = decDeg * DEG;
  const ha = normalizeSignedDeg(gmstDeg(ms) + lonDeg - raDeg) * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const az = Math.atan2(
    -Math.sin(ha),
    Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha),
  );
  return {
    alt: alt * RAD,
    az: normalizeDeg(az * RAD),
  };
}

function observingConditions(record, form) {
  const stepMs = 10 * 60_000;
  const bounds = observingNightBounds(record.visibility.timeMs, form.observerTimeZone);
  const samples = [];

  for (let ms = bounds.startMs; ms <= bounds.endMs; ms += stepMs) {
    const sun = sunEquatorial(ms);
    const moon = moonEquatorial(ms);
    const target = horizontalCoords(record.star.ra, record.star.dec, ms, form.location.lat, form.location.lon);
    const sunAltAz = horizontalCoords(sun.ra, sun.dec, ms, form.location.lat, form.location.lon);
    const moonAltAz = horizontalCoords(moon.ra, moon.dec, ms, form.location.lat, form.location.lon);
    samples.push({
      ms,
      targetAlt: target.alt,
      sunAlt: sunAltAz.alt,
      moonAlt: moonAltAz.alt,
    });
  }

  const minAlt = form.equipment.minAlt;
  const darkWindows = conditionWindows(samples, (sample) => sample.sunAlt <= -18, stepMs, bounds.endMs);
  const targetWindows = conditionWindows(samples, (sample) => sample.targetAlt >= minAlt, stepMs, bounds.endMs);
  const usableWindows = conditionWindows(
    samples,
    (sample) => sample.sunAlt <= -18 && sample.targetAlt >= minAlt,
    stepMs,
    bounds.endMs,
  );
  const bestUsable = samples
    .filter((sample) => sample.sunAlt <= -18 && sample.targetAlt >= minAlt)
    .sort((a, b) => b.targetAlt - a.targetAlt)[0];
  const darkest = samples.slice().sort((a, b) => a.sunAlt - b.sunAlt)[0];
  const moonSample = bestUsable || samples.reduce((best, sample) => (
    Math.abs(sample.ms - record.visibility.timeMs) < Math.abs(best.ms - record.visibility.timeMs) ? sample : best
  ), samples[0]);
  const phase = moonPhase(moonSample.ms);
  const moonText = t("observing.moonText", { phase: phase.label, illumination: phase.illuminationPercent }) +
    (moonSample.moonAlt >= 0 ? t("observing.moonAbove", { alt: moonSample.moonAlt.toFixed(0) }) : t("observing.moonBelow"));

  const usableWindowText = usableWindows.length
    ? formatWindowList(usableWindows, form.observerTimeZone)
    : t("observing.noOverlap");
  const targetWindowText = targetWindows.length
    ? formatWindowList(targetWindows, form.observerTimeZone)
    : t("observing.noTargetWindow", { minAlt });
  const darkWindowText = darkWindows.length
    ? formatWindowList(darkWindows, form.observerTimeZone)
    : t("observing.noDark", { sunAlt: darkest.sunAlt.toFixed(0) });

  const summary = bestUsable
    ? t("observing.summaryGood", {
      date: bounds.label,
      dark: darkWindowText,
      minAlt,
      target: targetWindowText,
      time: formatClock(bestUsable.ms, form.observerTimeZone),
      targetAlt: bestUsable.targetAlt.toFixed(0),
      sunAlt: bestUsable.sunAlt.toFixed(0),
    })
    : t("observing.summaryMixed", {
      date: bounds.label,
      dark: darkWindowText,
      minAlt,
      target: targetWindowText,
    });

  return {
    darkWindowText,
    targetWindowText,
    usableWindowText,
    moonText,
    summary,
  };
}

function observingNightBounds(bestMs, timeZone) {
  const parts = getZonedParts(bestMs, timeZone);
  const eveningDate = parts.hour < 12
    ? shiftLocalDate(parts.year, parts.month, parts.day, -1)
    : { year: parts.year, month: parts.month, day: parts.day };
  const startMs = zonedDateMs(eveningDate.year, eveningDate.month, eveningDate.day, 18, 0, timeZone);
  const endMs = zonedDateMs(eveningDate.year, eveningDate.month, eveningDate.day + 1, 8, 0, timeZone);
  return {
    startMs,
    endMs,
    label: `${eveningDate.year}-${pad2(eveningDate.month)}-${pad2(eveningDate.day)}`,
  };
}

function shiftLocalDate(year, month, day, offsetDays) {
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function conditionWindows(samples, predicate, stepMs, endMs) {
  const windows = [];
  let startMs = null;
  let lastMs = null;

  for (const sample of samples) {
    if (predicate(sample)) {
      if (startMs === null) startMs = sample.ms;
      lastMs = Math.min(sample.ms + stepMs, endMs);
    } else if (startMs !== null) {
      windows.push({ startMs, endMs: lastMs });
      startMs = null;
      lastMs = null;
    }
  }

  if (startMs !== null) windows.push({ startMs, endMs: lastMs });
  return windows;
}

function formatWindowList(windows, timeZone) {
  return windows.map((window) => `${formatClock(window.startMs, timeZone)}-${formatClock(window.endMs, timeZone)}`).join("，");
}

function formatClock(ms, timeZone) {
  const parts = getZonedParts(ms, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function sunEquatorial(ms) {
  const d = julianDay(ms) - 2451543.5;
  const w = normalizeDeg(282.9404 + 4.70935e-5 * d);
  const e = 0.016709 - 1.151e-9 * d;
  const meanAnomaly = normalizeDeg(356.0470 + 0.9856002585 * d);
  const eccentricAnomaly = meanAnomaly + e * RAD * Math.sin(meanAnomaly * DEG) * (1 + e * Math.cos(meanAnomaly * DEG));
  const xv = Math.cos(eccentricAnomaly * DEG) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly * DEG);
  const trueAnomaly = Math.atan2(yv, xv) * RAD;
  const lon = normalizeDeg(trueAnomaly + w);
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const x = Math.cos(lon * DEG);
  const y = Math.sin(lon * DEG) * Math.cos(obliquity);
  const z = Math.sin(lon * DEG) * Math.sin(obliquity);

  return {
    ra: normalizeDeg(Math.atan2(y, x) * RAD),
    dec: Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD,
  };
}

function moonEquatorial(ms) {
  const d = julianDay(ms) - 2451543.5;
  const node = normalizeDeg(125.1228 - 0.0529538083 * d) * DEG;
  const inclination = 5.1454 * DEG;
  const argPerigee = normalizeDeg(318.0634 + 0.1643573223 * d) * DEG;
  const semiMajorAxis = 60.2666;
  const eccentricity = 0.054900;
  const meanAnomaly = normalizeDeg(115.3654 + 13.0649929509 * d);
  const eccentricAnomaly = meanAnomaly + eccentricity * RAD * Math.sin(meanAnomaly * DEG) * (1 + eccentricity * Math.cos(meanAnomaly * DEG));
  const xOrbital = semiMajorAxis * (Math.cos(eccentricAnomaly * DEG) - eccentricity);
  const yOrbital = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly * DEG);
  const distance = Math.sqrt(xOrbital * xOrbital + yOrbital * yOrbital);
  const trueAnomaly = Math.atan2(yOrbital, xOrbital);
  const lonArg = trueAnomaly + argPerigee;
  const xEcliptic = distance * (Math.cos(node) * Math.cos(lonArg) - Math.sin(node) * Math.sin(lonArg) * Math.cos(inclination));
  const yEcliptic = distance * (Math.sin(node) * Math.cos(lonArg) + Math.cos(node) * Math.sin(lonArg) * Math.cos(inclination));
  const zEcliptic = distance * Math.sin(lonArg) * Math.sin(inclination);
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const xEquatorial = xEcliptic;
  const yEquatorial = yEcliptic * Math.cos(obliquity) - zEcliptic * Math.sin(obliquity);
  const zEquatorial = yEcliptic * Math.sin(obliquity) + zEcliptic * Math.cos(obliquity);

  return {
    ra: normalizeDeg(Math.atan2(yEquatorial, xEquatorial) * RAD),
    dec: Math.atan2(zEquatorial, Math.sqrt(xEquatorial * xEquatorial + yEquatorial * yEquatorial)) * RAD,
  };
}

function moonPhase(ms) {
  const age = positiveModulo(julianDay(ms) - 2451550.1, SYNODIC_MONTH_DAYS);
  const angle = (age / SYNODIC_MONTH_DAYS) * Math.PI * 2;
  const illuminationPercent = Math.round(((1 - Math.cos(angle)) / 2) * 100);
  const label = moonPhaseLabel(age);
  return { age, illuminationPercent, label };
}

function moonPhaseLabel(age) {
  if (age < 1.84566) return t("phase.new");
  if (age < 5.53699) return t("phase.crescent");
  if (age < 9.22831) return t("phase.firstQuarter");
  if (age < 12.91963) return t("phase.waxingGibbous");
  if (age < 16.61096) return t("phase.full");
  if (age < 20.30228) return t("phase.waningGibbous");
  if (age < 23.99361) return t("phase.lastQuarter");
  if (age < 27.68493) return t("phase.balsamic");
  return t("phase.new");
}

function julianDay(ms) {
  return ms / DAY_MS + 2440587.5;
}

function gmstDeg(ms) {
  const jd = julianDay(ms);
  const days = jd - 2451545.0;
  return normalizeDeg(280.46061837 + 360.98564736629 * days);
}

function nextBirthdayYear(form) {
  const now = Date.now();
  const nowParts = getZonedParts(now, form.birthTimeZone);
  let year = nowParts.year;
  const anniversary = anniversaryParts(year, form.birthMonth, form.birthDay);
  const thisYearMs = zonedDateMs(
    year,
    anniversary.month,
    anniversary.day,
    form.birthHour,
    form.birthMinute,
    form.birthTimeZone,
  );
  if (thisYearMs <= now) year += 1;
  return year;
}

function anniversaryParts(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28, adjusted: true };
  }
  return { year, month, day, adjusted: false };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function zonedDateMs(year, month, day, hour, minute, timeZone) {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utc = targetUtc;
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(utc, timeZone);
    const renderedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    utc -= renderedUtc - targetUtc;
  }
  return utc;
}

function getZonedParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function renderEmptyState() {
  $("catalogStatus").textContent = app.catalog ? $("catalogStatus").textContent : t("status.catalogLoading");
  $("summary").textContent = t("years.waiting");
  $("yearGrid").innerHTML = "";
  $("candidateTabs").innerHTML = "";
  $("detail").innerHTML = `<p class="empty-state">${escapeHTML(t("target.empty"))}</p>`;
  $("goToTarget").disabled = true;
  drawSkyChart(null);
  setStep(app.step);
}

function renderResults({ preserveStep = false } = {}) {
  const form = app.currentForm;
  const meta = app.catalog.meta || {};
  $("summary").innerHTML = [
    t("years.summary", {
      count: (meta.count || app.stars.length).toLocaleString(),
      distance: meta.maxDistanceLy || 150,
      mag: meta.maxGMag || 14,
    }),
    t("years.location", {
      name: escapeHTML(form.location.name),
      lat: form.location.lat.toFixed(3),
      lon: form.location.lon.toFixed(3),
      light: escapeHTML(form.location.light),
    }),
    t("years.equipment", {
      label: escapeHTML(equipmentText(form.equipment, "label")),
      maxMag: form.equipment.maxMag,
      easyMag: form.equipment.easyMag,
    }),
  ].join("<br>");

  const grid = $("yearGrid");
  grid.innerHTML = app.results.map((result, index) => renderYearCell(result, index)).join("");
  grid.querySelectorAll(".year-cell").forEach((button) => {
    button.addEventListener("click", () => {
      app.selectedIndex = Number(button.dataset.index);
      app.selectedKind = "precision";
      renderResults();
      setStep("target");
    });
  });

  renderCandidateTabs();
  renderDetail();
  $("goToTarget").disabled = !currentRecord();
  if (preserveStep) setStep(app.step);
}

function renderYearCell(result, index) {
  const active = index === app.selectedIndex ? " active" : "";
  const precision = result.precision ? formatDelta(result.precision.deltaDays) : t("years.noCandidate");
  const brightMag = result.bright ? `G ${result.bright.star.gMag.toFixed(1)}` : t("years.none");
  const dateLabel = `${result.anniversary.month}/${String(result.anniversary.day).padStart(2, "0")}`;
  const quality = result.precision || result.bright ? "available" : "empty";
  return `
    <button class="year-cell ${quality}${active}" type="button" data-index="${index}">
      <span class="year-cell-top">
        <strong>${result.year}</strong>
        <em>${dateLabel}</em>
      </span>
      <span class="year-cell-data">
        <span>${escapeHTML(t("years.precision", { value: precision }))}</span>
        <span>${escapeHTML(t("years.bright", { value: brightMag }))}</span>
      </span>
    </button>
  `;
}

function renderCandidateTabs() {
  const result = app.results[app.selectedIndex];
  const tabs = $("candidateTabs");
  if (!result) {
    tabs.innerHTML = "";
    return;
  }
  const items = [
    { key: "precision", label: t("tabs.precision"), record: result.precision },
    { key: "bright", label: t("tabs.bright"), record: result.bright },
  ];
  tabs.innerHTML = items.map((item) => {
    const active = app.selectedKind === item.key ? " active" : "";
    const disabled = item.record ? "" : " disabled";
    const name = item.record ? displayName(item.record.star) : t("tabs.unavailable");
    return `<button class="tab-button${active}" type="button" data-kind="${item.key}"${disabled}><span>${item.label}</span><strong>${escapeHTML(name)}</strong></button>`;
  }).join("");
  tabs.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      app.selectedKind = button.dataset.kind;
      renderCandidateTabs();
      renderDetail();
    });
  });
}

function renderDetail() {
  const result = app.results[app.selectedIndex];
  const detail = $("detail");
  if (!result) {
    detail.innerHTML = `<p class="empty-state">${escapeHTML(t("target.empty"))}</p>`;
    drawSkyChart(null);
    return;
  }
  const record = result[app.selectedKind] || result.precision || result.bright;
  if (!record) {
    detail.innerHTML = `<p class="empty-state">${escapeHTML(result.status)}</p>`;
    drawSkyChart(null);
    return;
  }
  const star = record.star;
  const form = app.currentForm;
  const kindLabel = app.selectedKind === "bright" ? t("target.bestPhoto") : t("target.bestTiming");
  const simbadUrl = `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${encodeURIComponent(`${star.ra} ${star.dec}`)}&Radius=5&Radius.unit=arcsec`;
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(`${star.ra} ${star.dec}`)}&fov=0.1&survey=P%2FDSS2%2Fcolor`;
  const weatherNote = weatherText(record.targetMs);
  const weatherPanel = renderWeatherPanel(record, form);
  const subtitle = secondaryName(star);
  const identifiers = identifierSummary(star);
  const conditions = observingConditions(record, form);
  const targetDate = `${result.year}-${pad2(result.anniversary.month)}-${pad2(result.anniversary.day)}`;

  detail.innerHTML = `
    <section class="public-answer" aria-label="${escapeHTML(t("target.publicBadge"))}">
      <div class="public-answer-head">
        <span class="target-label">${escapeHTML(kindLabel)}</span>
        <h3 class="star-name">${escapeHTML(t("target.publicHeadline", { star: displayName(star) }))}</h3>
        ${subtitle ? `<p class="star-subtitle">${escapeHTML(subtitle)}</p>` : ""}
        <p class="plain-intro">${escapeHTML(t("target.publicIntro", { date: targetDate, star: displayName(star) }))}</p>
        <p class="public-subline">${escapeHTML(t("target.publicSubline"))}</p>
      </div>
      <div class="plain-grid">
        <section class="plain-card">
          <span>${escapeHTML(t("target.starCardTitle"))}</span>
          <strong>${escapeHTML(displayName(star))}</strong>
          <p>${escapeHTML(t("target.starCardBody", { subtitle: subtitle || identifiers }))}</p>
        </section>
        <section class="plain-card">
          <span>${escapeHTML(t("target.arrivalCardTitle"))}</span>
          <strong>${escapeHTML(formatZoned(record.arrivalMs, form.observerTimeZone))}</strong>
          <p>${escapeHTML(t("target.arrivalCardBody", { arrival: formatZoned(record.arrivalMs, form.observerTimeZone), delta: formatDelta(record.deltaDays) }))}</p>
        </section>
        <section class="plain-card">
          <span>${escapeHTML(t("target.whereCardTitle"))}</span>
          <strong>${escapeHTML(`${azLabel(record.visibility.az)} · ${record.visibility.alt.toFixed(0)}°`)}</strong>
          <p>${escapeHTML(t("target.whereCardBody", { time: formatZoned(record.visibility.timeMs, form.observerTimeZone), azLabel: azLabel(record.visibility.az), alt: record.visibility.alt.toFixed(0) }))}</p>
        </section>
        <section class="plain-card">
          <span>${escapeHTML(t("target.shootCardTitle"))}</span>
          <strong>${escapeHTML(equipmentText(form.equipment, "label"))}</strong>
          <p>${escapeHTML(t("target.shootCardBody", { equipment: equipmentText(form.equipment, "label"), note: equipmentText(form.equipment, "note") }))}</p>
        </section>
      </div>
      <p class="plain-note">${escapeHTML(t("target.simpleNote"))}</p>
    </section>
    ${weatherPanel}
    <details class="science-details">
      <summary>${escapeHTML(t("target.details"))}</summary>
      <div class="metric-grid">
        <div class="metric"><span>${escapeHTML(t("target.metricArrival"))}</span><strong>${formatZoned(record.arrivalMs, form.observerTimeZone)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricBirthday"))}</span><strong>${formatZoned(record.targetMs, form.birthTimeZone)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricDelta"))}</span><strong>${formatDelta(record.deltaDays)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricDistance"))}</span><strong>${escapeHTML(t("target.distanceRange", { min: star.distanceMinLy.toFixed(3), max: star.distanceMaxLy.toFixed(3) }))}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricBrightness"))}</span><strong>${escapeHTML(t("target.brightnessColor", { mag: star.gMag.toFixed(2), color: colorLabel(star.colorClass) }))}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricWindow"))}</span><strong>${escapeHTML(t("target.windowValue", { time: formatZoned(record.visibility.timeMs, form.observerTimeZone), alt: record.visibility.alt.toFixed(0) }))}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricIds"))}</span><strong>${escapeHTML(identifiers)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricDark"))}</span><strong>${escapeHTML(conditions.usableWindowText)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricMoon"))}</span><strong>${escapeHTML(conditions.moonText)}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricCoords"))}</span><strong>${escapeHTML(t("target.coordsValue", { ra: star.ra.toFixed(5), dec: star.dec.toFixed(5) }))}</strong></div>
        <div class="metric"><span>${escapeHTML(t("target.metricDirection"))}</span><strong>${escapeHTML(t("target.directionValue", { label: azLabel(record.visibility.az), az: record.visibility.az.toFixed(0) }))}</strong></div>
      </div>
      <div class="equipment-note">
        <strong>${escapeHTML(equipmentText(form.equipment, "label"))}</strong>
        <span>${escapeHTML(equipmentText(form.equipment, "price"))}</span>
        <span>${escapeHTML(equipmentText(form.equipment, "skill"))}</span>
      </div>
      <ul class="note-list">
        <li>${escapeHTML(equipmentText(form.equipment, "note"))}</li>
        <li>${escapeHTML(conditions.summary)}</li>
        <li>${escapeHTML(weatherNote)}</li>
        <li>${escapeHTML(t("target.parallaxNote", { start: formatZoned(record.arrivalMinMs, form.observerTimeZone), end: formatZoned(record.arrivalMaxMs, form.observerTimeZone) }))}</li>
        <li>${escapeHTML(t("target.findingNote", { id: star.id }))}</li>
        <li>${escapeHTML(t("target.ephemerisNote"))}</li>
      </ul>
    </details>
    <div class="link-row">
      <a class="link-action" href="${simbadUrl}" target="_blank" rel="noreferrer">${escapeHTML(t("links.simbad"))}</a>
      <a class="link-action" href="${aladinUrl}" target="_blank" rel="noreferrer">${escapeHTML(t("links.aladin"))}</a>
      <a class="link-action" href="https://gea.esac.esa.int/archive/" target="_blank" rel="noreferrer">${escapeHTML(t("links.gaia"))}</a>
      <button id="calendarButton" class="link-action" type="button">${escapeHTML(t("target.calendar"))}</button>
    </div>
  `;
  bindWeatherControls(record, form);
  bindCalendarDownload(record, form);
  drawSkyChart(record);
}

function renderWeatherPanel(record, form) {
  const availability = weatherAvailability(record.visibility.timeMs);
  const button = availability.available
    ? `<button id="weatherCheckButton" class="secondary-action weather-button" type="button">${escapeHTML(t("weather.button"))}</button>`
    : "";
  return `
    <section class="weather-card" aria-labelledby="weatherTitle">
      <div class="weather-heading">
        <div>
          <span>${escapeHTML(t("weather.eyebrow"))}</span>
          <strong id="weatherTitle">${escapeHTML(t("weather.title"))}</strong>
        </div>
        ${button}
      </div>
      <p id="weatherStatus" class="weather-status">${escapeHTML(availability.message)}</p>
      <div id="weatherResult" class="weather-result"></div>
    </section>
  `;
}

function bindWeatherControls(record, form) {
  const button = $("weatherCheckButton");
  if (!button) return;
  button.addEventListener("click", () => checkWeather(record, form));
}

async function checkWeather(record, form) {
  const button = $("weatherCheckButton");
  const status = $("weatherStatus");
  const result = $("weatherResult");
  button.disabled = true;
  button.textContent = t("weather.loading");
  status.textContent = t("weather.loadingText");
  result.innerHTML = "";

  try {
    const response = await fetch(weatherApiUrl(record, form), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const forecast = await response.json();
    const summary = summarizeForecast(forecast, record.visibility.timeMs, form.observerTimeZone);
    status.textContent = summary.summary;
    result.innerHTML = renderWeatherResult(summary);
  } catch (error) {
    status.innerHTML = `<span class="warning">${escapeHTML(t("weather.fetchFailed", { message: error.message || t("weather.unknown") }))}</span>`;
  } finally {
    button.disabled = false;
    button.textContent = t("weather.retry");
  }
}

function weatherApiUrl(record, form) {
  const params = new URLSearchParams({
    latitude: form.location.lat.toFixed(4),
    longitude: form.location.lon.toFixed(4),
    hourly: [
      "cloud_cover",
      "visibility",
      "precipitation_probability",
      "wind_speed_10m",
      "wind_gusts_10m",
      "temperature_2m",
      "relative_humidity_2m",
    ].join(","),
    forecast_days: "16",
    timezone: "GMT",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function summarizeForecast(forecast, targetMs, timeZone) {
  const hourly = forecast.hourly || {};
  const times = hourly.time || [];
  if (!times.length) throw new Error(t("weather.noData"));

  const rows = times.map((time, index) => ({
    ms: Date.parse(`${time}Z`),
    cloud: numberAt(hourly.cloud_cover, index),
    visibility: numberAt(hourly.visibility, index),
    precip: numberAt(hourly.precipitation_probability, index),
    wind: numberAt(hourly.wind_speed_10m, index),
    gust: numberAt(hourly.wind_gusts_10m, index),
    temp: numberAt(hourly.temperature_2m, index),
    humidity: numberAt(hourly.relative_humidity_2m, index),
  })).filter((row) => Number.isFinite(row.ms));

  const nearby = rows.filter((row) => Math.abs(row.ms - targetMs) <= 2 * 60 * 60_000);
  const sample = nearby.length ? averageWeatherRows(nearby) : nearestWeatherRow(rows, targetMs);
  const grade = weatherGrade(sample);
  const sampleTime = nearestWeatherRow(rows, targetMs).ms;

  return {
    ...sample,
    grade,
    summary: t("weather.summary", {
      grade: grade.label,
      time: formatZoned(sampleTime, timeZone),
      hours: formatHours((sampleTime - targetMs) / 3_600_000),
    }),
  };
}

function numberAt(values, index) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : null;
}

function averageWeatherRows(rows) {
  return {
    cloud: average(rows, "cloud"),
    visibility: average(rows, "visibility"),
    precip: average(rows, "precip"),
    wind: average(rows, "wind"),
    gust: average(rows, "gust"),
    temp: average(rows, "temp"),
    humidity: average(rows, "humidity"),
  };
}

function nearestWeatherRow(rows, targetMs) {
  return rows.slice().sort((a, b) => Math.abs(a.ms - targetMs) - Math.abs(b.ms - targetMs))[0];
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weatherGrade(weather) {
  if (
    metricAtLeast(weather.cloud, 75) ||
    metricAtLeast(weather.precip, 45) ||
    metricBelow(weather.visibility, 6000) ||
    metricAtLeast(weather.gust, 40)
  ) {
    return { label: t("weather.bad"), tone: "bad" };
  }
  if (
    metricAtLeast(weather.cloud, 45) ||
    metricAtLeast(weather.precip, 20) ||
    metricBelow(weather.visibility, 12000) ||
    metricAtLeast(weather.gust, 28)
  ) {
    return { label: t("weather.mixed"), tone: "mixed" };
  }
  return { label: t("weather.good"), tone: "good" };
}

function metricAtLeast(value, threshold) {
  return Number.isFinite(value) && value >= threshold;
}

function metricBelow(value, threshold) {
  return Number.isFinite(value) && value < threshold;
}

function renderWeatherResult(weather) {
  const visibilityKm = Number.isFinite(weather.visibility) ? `${(weather.visibility / 1000).toFixed(1)} km` : t("weather.unknown");
  return `
    <div class="weather-result-grid ${weather.grade.tone}">
      <div><span>${escapeHTML(t("weather.cloud"))}</span><strong>${formatWeatherValue(weather.cloud, "%")}</strong></div>
      <div><span>${escapeHTML(t("weather.precip"))}</span><strong>${formatWeatherValue(weather.precip, "%")}</strong></div>
      <div><span>${escapeHTML(t("weather.visibility"))}</span><strong>${visibilityKm}</strong></div>
      <div><span>${escapeHTML(t("weather.wind"))}</span><strong>${formatWeatherValue(weather.wind, " km/h")} / ${formatWeatherValue(weather.gust, " km/h")}</strong></div>
      <div><span>${escapeHTML(t("weather.temp"))}</span><strong>${formatWeatherValue(weather.temp, "°C")}</strong></div>
      <div><span>${escapeHTML(t("weather.humidity"))}</span><strong>${formatWeatherValue(weather.humidity, "%")}</strong></div>
    </div>
  `;
}

function formatWeatherValue(value, unit) {
  if (!Number.isFinite(value)) return t("weather.unknown");
  return `${Math.round(value)}${unit}`;
}

function formatHours(hours) {
  const abs = Math.abs(hours);
  if (abs < 0.15) return t("hours.zero");
  return hours >= 0 ? t("hours.late", { value: abs.toFixed(1) }) : t("hours.early", { value: abs.toFixed(1) });
}

function bindCalendarDownload(record, form) {
  const button = $("calendarButton");
  if (!button) return;
  button.addEventListener("click", () => downloadCalendarEvent(record, form));
}

function downloadCalendarEvent(record, form) {
  const star = record.star;
  const startMs = record.visibility.timeMs;
  const endMs = startMs + 2 * 60 * 60_000;
  const title = `Birthday Starlight: ${displayName(star)}`;
  const description = [
    `Target: ${displayName(star)}`,
    `Gaia DR3 source_id: ${star.id}`,
    `Arrival estimate: ${formatZoned(record.arrivalMs, form.observerTimeZone)}`,
    `Birthday target: ${formatZoned(record.targetMs, form.birthTimeZone)}`,
    `Timing offset: ${formatDelta(record.deltaDays)}`,
    `Distance range: ${star.distanceMinLy.toFixed(3)}-${star.distanceMaxLy.toFixed(3)} light-years`,
    `Magnitude: Gaia G ${star.gMag.toFixed(2)}`,
    `Coordinates: RA ${star.ra.toFixed(5)} deg, Dec ${star.dec.toFixed(5)} deg`,
    `Best window: ${formatZoned(record.visibility.timeMs, form.observerTimeZone)}, altitude ${record.visibility.alt.toFixed(0)} deg, azimuth ${record.visibility.az.toFixed(0)} deg`,
    "Check weather, moonlight, transparency, and framing before observing.",
  ].join("\n");
  const location = `${form.location.name} (${form.location.lat.toFixed(4)}, ${form.location.lon.toFixed(4)})`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Birthday Starlight//Find My Star//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${calendarUid(record, form)}`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(startMs)}`,
    `DTEND:${formatIcsDate(endMs)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(displayName(star))}-${formatIcsDate(startMs).slice(0, 8)}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function calendarUid(record, form) {
  const date = formatIcsDate(record.visibility.timeMs);
  const place = `${form.location.lat.toFixed(4)},${form.location.lon.toFixed(4)}`;
  return `${record.star.id}-${date}-${place}@birthday-starlight`;
}

function formatIcsDate(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "birthday-starlight";
}

function drawSkyChart(record) {
  const canvas = $("skyChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#111613";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 12;
  const radius = Math.min(w, h) * 0.38;

  ctx.strokeStyle = "rgba(231, 237, 226, 0.22)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(231, 237, 226, 0.82)";
  ctx.font = "16px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - radius - 16);
  ctx.fillText("S", cx, cy + radius + 28);
  ctx.fillText("E", cx + radius + 22, cy + 5);
  ctx.fillText("W", cx - radius - 22, cy + 5);

  ctx.fillStyle = "rgba(184, 195, 182, 0.88)";
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.fillText("90°", cx, cy + 4);
  ctx.fillText("45°", cx, cy - radius * 0.5 - 6);
  ctx.fillText(t("target.skyHorizon"), cx, cy + radius + 14);

  if (!record) {
    ctx.fillStyle = "rgba(184, 195, 182, 0.9)";
    ctx.fillText(t("target.skyWaiting"), cx, cy);
    return;
  }

  const alt = clamp(record.visibility.alt, 0, 90);
  const az = record.visibility.az * DEG;
  const r = ((90 - alt) / 90) * radius;
  const x = cx + Math.sin(az) * r;
  const y = cy - Math.cos(az) * r;
  const color = STAR_COLORS[record.star.colorClass] || STAR_COLORS.unknown;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = "#f4f6f0";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.textAlign = x > cx ? "left" : "right";
  ctx.fillText(displayName(record.star), x + (x > cx ? 12 : -12), y - 10);
  ctx.fillStyle = "rgba(231, 237, 226, 0.88)";
  ctx.fillText(t("target.skyAltAz", { alt: record.visibility.alt.toFixed(0), az: record.visibility.az.toFixed(0) }), x + (x > cx ? 12 : -12), y + 10);
}

function drawStarscape() {
  const canvas = $("starscape");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(130, Math.floor(window.innerWidth / 9)) }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.2,
      alpha: Math.random() * 0.22 + 0.08,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = "rgba(42, 67, 52, 0.05)";
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}

function displayName(star) {
  const aliases = aliasFor(star);
  if (aliases?.commonName) return aliases.commonName;
  if (aliases?.bayerName) return aliases.bayerName;
  if (aliases?.hip) return aliases.hip;
  if (aliases?.hd) return aliases.hd;
  if (aliases?.gj) return aliases.gj;
  return star.designation || `Gaia DR3 ${star.id}`;
}

function secondaryName(star) {
  const aliases = aliasFor(star);
  if (!aliases) return "";
  const names = [
    aliases.commonName ? aliases.bayerName : "",
    aliases.simbadMainId && aliases.simbadMainId !== aliases.bayerDesignation ? aliases.simbadMainId : "",
    star.designation || `Gaia DR3 ${star.id}`,
  ].filter(Boolean);
  return unique(names).join(" · ");
}

function identifierSummary(star) {
  const aliases = aliasFor(star);
  if (!aliases) return `Gaia DR3 ${star.id}`;
  const identifiers = [
    aliases.hip,
    aliases.hd,
    aliases.hr,
    aliases.gj,
    aliases.simbadMainId ? `SIMBAD ${aliases.simbadMainId}` : "",
    `Gaia DR3 ${star.id}`,
  ].filter(Boolean);
  return unique(identifiers).join(" · ");
}

function aliasFor(star) {
  return app.crossIds?.[star.id] || null;
}

function unique(values) {
  return [...new Set(values)];
}

function colorLabel(colorClass) {
  return t(`color.${colorClass}`) || t("color.unknown");
}

function weatherAvailability(observationMs) {
  const daysAway = (observationMs - Date.now()) / DAY_MS;
  if (daysAway < -1) {
    return {
      available: false,
      message: t("weather.unavailablePast"),
    };
  }
  if (daysAway > 16) {
    return {
      available: false,
      message: t("weather.unavailableFuture"),
    };
  }
  return {
    available: true,
    message: t("weather.available"),
  };
}

function weatherText(targetMs) {
  const daysAway = (targetMs - Date.now()) / DAY_MS;
  if (daysAway >= 0 && daysAway <= 16) {
    return t("weather.nearNote");
  }
  return t("weather.futureNote");
}

function formatDelta(days) {
  const abs = Math.abs(days);
  if (abs < 0.04) return t("delta.same");
  const direction = days >= 0 ? t("delta.late") : t("delta.early");
  if (abs < 1) return t("delta.hours", { dir: direction, value: (abs * 24).toFixed(1) });
  if (abs < 45) return t("delta.days", { dir: direction, value: abs.toFixed(1) });
  return t("delta.months", { dir: direction, value: (abs / 30.4375).toFixed(1) });
}

function formatZoned(ms, timeZone) {
  const parts = getZonedParts(ms, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)} ${timeZone}`;
}

function azLabel(az) {
  const labels = t("direction");
  return labels[Math.round(normalizeDeg(az) / 45) % 8];
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDeg(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDeg(value) {
  const deg = normalizeDeg(value);
  return deg > 180 ? deg - 360 : deg;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
