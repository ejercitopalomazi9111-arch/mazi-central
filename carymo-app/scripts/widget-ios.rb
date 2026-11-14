# Mete en App.xcodeproj lo que Capacitor no trae: el puente con los widgets (App) y la extensión de widgets
# (CarymoWidget), con su App Group. Se puede correr las veces que sea: si ya está, no lo duplica.
#   ruby carymo-app/scripts/widget-ios.rb
require 'xcodeproj'

RAIZ = File.expand_path('../ios/App', __dir__)
p = Xcodeproj::Project.open(File.join(RAIZ, 'App.xcodeproj'))
app = p.targets.find { |t| t.name == 'App' } or abort 'no encontré el target App'
grupo_app = p.main_group.find_subpath('App', false)

# 1 · el puente (MainViewController + CarymoWidgetPlugin) en la app
%w[MainViewController.swift CarymoWidgetPlugin.swift].each do |f|
  next if grupo_app.files.any? { |r| r.path == f }
  ref = grupo_app.new_reference(f)
  app.add_file_references([ref])
end
grupo_app.new_reference('App.entitlements') unless grupo_app.files.any? { |r| r.path == 'App.entitlements' }
app.build_configurations.each { |c| c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }

# 2 · la extensión de widgets
ext = p.targets.find { |t| t.name == 'CarymoWidget' }
unless ext
  ext = p.new_target(:app_extension, 'CarymoWidget', :ios, '17.0', nil, :swift)
  g = p.main_group.find_subpath('CarymoWidget', true)
  g.set_source_tree('<group>'); g.set_path('CarymoWidget')
  ext.add_file_references([g.new_reference('CarymoWidget.swift')])
  g.new_reference('Info.plist'); g.new_reference('CarymoWidget.entitlements')
  %w[WidgetKit SwiftUI].each do |fw|
    ref = p.frameworks_group.new_file("System/Library/Frameworks/#{fw}.framework", :sdk_root)
    ext.frameworks_build_phase.add_file_reference(ref, true)
  end
  # la app la lleva adentro
  copia = app.new_copy_files_build_phase('Embed Foundation Extensions')
  copia.symbol_dst_subfolder_spec = :plug_ins
  bf = copia.add_file_reference(ext.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  app.add_dependency(ext)
end
ext.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = 'mx.grupomazi.carymo.widget'
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = 'CarymoWidget/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS'] = 'CarymoWidget/CarymoWidget.entitlements'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['MARKETING_VERSION'] = '1.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['SKIP_INSTALL'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['CODE_SIGN_STYLE'] = 'Automatic'
end
p.save
puts "listo: #{p.targets.map(&:name).join(', ')}"
