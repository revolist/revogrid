
export type RevogridEvents = 'contentsizechanged'|
  'datasizechanged'|
  'beforeedit'|
  'beforerangeedit'|
  'afteredit'|
  'beforeautofill'|
  'beforerange'|
  'afterfocus'|
  'roworderchanged'|
  'beforesorting'|
  'beforesourcesortingapply'|
  'beforesortingapply'|
  'rowdragstart'|
  'headerclick'|
  'beforecellfocus'|
  'beforefocuslost'|
  'beforesourceset'|
  'beforeanysource'|
  'aftersourceset'|
  'afteranysource'|
  'beforecolumnsset'|
  'beforecolumnapplied'|
  'aftercolumnsset'|
  'beforefilterapply'|
  'beforefiltertrimmed'|
  'beforetrimmed'|
  'aftertrimmed'|
  'viewportscroll'|
  'beforeexport'|
  'beforeeditstart'|
  'aftercolumnresize'|
  'beforerowdefinition'|
  'filterconfigchanged'|
  'sortingconfigchanged'|
  'rowheaderschanged'|
  'beforegridrender'|
  'aftergridrender'|
  'aftergridinit'|
  'additionaldatachanged'|
  'afterthemechanged'|
  'created'|
  'onrangeselectionchanged'|
  'ondblclick'|
  'beforepaste'|
  'beforepasteapply'|
  'pasteregion'|
  'afterpasteapply'|
  'beforecut'|
  'clearregion'|
  'beforecopy'|
  'beforecopyapply'|
  'copyregion'|
  'menuClosed'|
  'beforerowrender'|
  'afterrender'|
  'beforecellrender'|
  'beforedatarender'|
  'dragstartcell'|
  'celledit'|
  'closeedit'|
  'filterChange'|
  'resetChange'|
  'beforefocusrender'|
  'beforescrollintoview'|
  'afterfocus'|
  'beforeheaderclick'|
  'headerresize'|
  'beforeheaderresize'|
  'headerdblclick'|
  'beforeheaderrender'|
  'afterheaderrender'|
  'rowdragstartinit'|
  'rowdragendinit'|
  'rowdragmoveinit'|
  'rowdragmousemove'|
  'rowdropinit'|
  'roworderchange'|
  'beforecopyregion'|
  'beforepasteregion'|
  'celleditapply'|
  'beforecellfocusinit'|
  'beforenextvpfocus'|
  'setedit'|
  'beforeapplyrange'|
  'beforesetrange'|
  'setrange'|
  'beforeeditrender'|
  'selectall'|
  'canceledit'|
  'settemprange'|
  'beforesettemprange'|
  'applyfocus'|
  'focuscell'|
  'beforerangedataapply'|
  'selectionchangeinit'|
  'beforerangecopyapply'|
  'rangeeditapply'|
  'clipboardrangecopy'|
  'clipboardrangepaste'|
  'beforekeydown'|
  'beforekeyup'|
  'beforecellsave'|
  'onrangeselectionchangedinit'|
  'ondblclickinit'|
  'scrollview'|
  'ref'|
  'scrollvirtual'|
  'scrollviewport'|
  'resizeviewport'|
  'scrollchange'|
  'scrollviewportsilent'|
  'html'
export const REVOGRID_EVENTS = new Map<RevogridEvents, RevogridEvents>([
  ['contentsizechanged', 'contentsizechanged'],
  ['datasizechanged', 'datasizechanged'],
  ['beforeedit', 'beforeedit'],
  ['beforerangeedit', 'beforerangeedit'],
  ['afteredit', 'afteredit'],
  ['beforeautofill', 'beforeautofill'],
  ['beforerange', 'beforerange'],
  ['afterfocus', 'afterfocus'],
  ['roworderchanged', 'roworderchanged'],
  ['beforesorting', 'beforesorting'],
  ['beforesourcesortingapply', 'beforesourcesortingapply'],
  ['beforesortingapply', 'beforesortingapply'],
  ['rowdragstart', 'rowdragstart'],
  ['headerclick', 'headerclick'],
  ['beforecellfocus', 'beforecellfocus'],
  ['beforefocuslost', 'beforefocuslost'],
  ['beforesourceset', 'beforesourceset'],
  ['beforeanysource', 'beforeanysource'],
  ['aftersourceset', 'aftersourceset'],
  ['afteranysource', 'afteranysource'],
  ['beforecolumnsset', 'beforecolumnsset'],
  ['beforecolumnapplied', 'beforecolumnapplied'],
  ['aftercolumnsset', 'aftercolumnsset'],
  ['beforefilterapply', 'beforefilterapply'],
  ['beforefiltertrimmed', 'beforefiltertrimmed'],
  ['beforetrimmed', 'beforetrimmed'],
  ['aftertrimmed', 'aftertrimmed'],
  ['viewportscroll', 'viewportscroll'],
  ['beforeexport', 'beforeexport'],
  ['beforeeditstart', 'beforeeditstart'],
  ['aftercolumnresize', 'aftercolumnresize'],
  ['beforerowdefinition', 'beforerowdefinition'],
  ['filterconfigchanged', 'filterconfigchanged'],
  ['sortingconfigchanged', 'sortingconfigchanged'],
  ['rowheaderschanged', 'rowheaderschanged'],
  ['beforegridrender', 'beforegridrender'],
  ['aftergridrender', 'aftergridrender'],
  ['aftergridinit', 'aftergridinit'],
  ['additionaldatachanged', 'additionaldatachanged'],
  ['afterthemechanged', 'afterthemechanged'],
  ['created', 'created'],
  ['onrangeselectionchanged', 'onrangeselectionchanged'],
  ['ondblclick', 'ondblclick'],
  ['beforepaste', 'beforepaste'],
  ['beforepasteapply', 'beforepasteapply'],
  ['pasteregion', 'pasteregion'],
  ['afterpasteapply', 'afterpasteapply'],
  ['beforecut', 'beforecut'],
  ['clearregion', 'clearregion'],
  ['beforecopy', 'beforecopy'],
  ['beforecopyapply', 'beforecopyapply'],
  ['copyregion', 'copyregion'],
  ['menuClosed', 'menuClosed'],
  ['beforerowrender', 'beforerowrender'],
  ['afterrender', 'afterrender'],
  ['beforecellrender', 'beforecellrender'],
  ['beforedatarender', 'beforedatarender'],
  ['dragstartcell', 'dragstartcell'],
  ['celledit', 'celledit'],
  ['closeedit', 'closeedit'],
  ['filterChange', 'filterChange'],
  ['resetChange', 'resetChange'],
  ['beforefocusrender', 'beforefocusrender'],
  ['beforescrollintoview', 'beforescrollintoview'],
  ['afterfocus', 'afterfocus'],
  ['beforeheaderclick', 'beforeheaderclick'],
  ['headerresize', 'headerresize'],
  ['beforeheaderresize', 'beforeheaderresize'],
  ['headerdblclick', 'headerdblclick'],
  ['beforeheaderrender', 'beforeheaderrender'],
  ['afterheaderrender', 'afterheaderrender'],
  ['rowdragstartinit', 'rowdragstartinit'],
  ['rowdragendinit', 'rowdragendinit'],
  ['rowdragmoveinit', 'rowdragmoveinit'],
  ['rowdragmousemove', 'rowdragmousemove'],
  ['rowdropinit', 'rowdropinit'],
  ['roworderchange', 'roworderchange'],
  ['beforecopyregion', 'beforecopyregion'],
  ['beforepasteregion', 'beforepasteregion'],
  ['celleditapply', 'celleditapply'],
  ['beforecellfocusinit', 'beforecellfocusinit'],
  ['beforenextvpfocus', 'beforenextvpfocus'],
  ['setedit', 'setedit'],
  ['beforeapplyrange', 'beforeapplyrange'],
  ['beforesetrange', 'beforesetrange'],
  ['setrange', 'setrange'],
  ['beforeeditrender', 'beforeeditrender'],
  ['selectall', 'selectall'],
  ['canceledit', 'canceledit'],
  ['settemprange', 'settemprange'],
  ['beforesettemprange', 'beforesettemprange'],
  ['applyfocus', 'applyfocus'],
  ['focuscell', 'focuscell'],
  ['beforerangedataapply', 'beforerangedataapply'],
  ['selectionchangeinit', 'selectionchangeinit'],
  ['beforerangecopyapply', 'beforerangecopyapply'],
  ['rangeeditapply', 'rangeeditapply'],
  ['clipboardrangecopy', 'clipboardrangecopy'],
  ['clipboardrangepaste', 'clipboardrangepaste'],
  ['beforekeydown', 'beforekeydown'],
  ['beforekeyup', 'beforekeyup'],
  ['beforecellsave', 'beforecellsave'],
  ['onrangeselectionchangedinit', 'onrangeselectionchangedinit'],
  ['ondblclickinit', 'ondblclickinit'],
  ['scrollview', 'scrollview'],
  ['ref', 'ref'],
  ['scrollvirtual', 'scrollvirtual'],
  ['scrollviewport', 'scrollviewport'],
  ['resizeviewport', 'resizeviewport'],
  ['scrollchange', 'scrollchange'],
  ['scrollviewportsilent', 'scrollviewportsilent'],
  ['html', 'html']
]);